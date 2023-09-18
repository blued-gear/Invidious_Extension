package apps.chocolatecakecodes.invidious_ext.download.service

import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadRequestDto
import apps.chocolatecakecodes.invidious_ext.download.enums.DownloadJobState
import apps.chocolatecakecodes.invidious_ext.download.enums.FileType
import apps.chocolatecakecodes.invidious_ext.download.service.exception.JobNotFoundException
import apps.chocolatecakecodes.invidious_ext.download.util.MathUtils
import apps.chocolatecakecodes.invidious_ext.download.util.PathUtils
import io.micronaut.context.annotation.Value
import jakarta.annotation.PostConstruct
import jakarta.annotation.PreDestroy
import jakarta.inject.Inject
import jakarta.inject.Named
import jakarta.inject.Singleton
import org.slf4j.LoggerFactory
import java.io.FileNotFoundException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write
import kotlin.io.path.absolute
import kotlin.io.path.extension
import kotlin.io.path.nameWithoutExtension

@Singleton
class YoutubeDlpService(
    @Inject @Named("downloaderThreadPool") private val processExecutorService: ExecutorService,
    @Value("\${inv-ext.download.dir}") private val dirPath: String
) {

    companion object {
        const val JOB_ID_BITS = 256

        private val LOGGER = LoggerFactory.getLogger(YoutubeDlpService::class.java)
        private val JOB_ID_FORMATTER = HexFormat.of()
        private val PLACEHOLDER_JOB = DownloadJob("~~placeholder~~", Path.of(""), Path.of(""), false)
        private val PROGRESS_PATTERN = Regex("(\\d+\\.\\d+)%")
    }
    
    private val downloadDir = Path.of(dirPath, "running").absolute()
    private val jobs: MutableMap<String, DownloadJob> = HashMap()
    private val jobsLock = ReentrantReadWriteLock()
    private val idRng = Random()

    fun startJob(options: DownloadRequestDto, destPath: String, progressListener: JobProgressListener?): String {
        val (id, dir) = allocJobId()

        val downloadsVideo = options.destType == FileType.VIDEO
        val job = DownloadJob(id, dir, Path.of(destPath), downloadsVideo).apply {
            listener = progressListener
        }
        jobsLock.write {
            jobs[id] = job
        }

        val args = prepareArgs()
        argsForFileFormat(options.destType, args)
        args.add("https://youtube.com/watch?v=${options.videoId}")

        runJob(job, args)

        return job.id
    }

    fun cancelJob(id: String) {
        val job = jobsLock.read {
            jobs[id]
        } ?: throw JobNotFoundException(id)

        cancelJob(job)
    }

    @PostConstruct
    private fun initDir() {
        Files.createDirectories(downloadDir)
    }

    @PreDestroy
    private fun shutdown() {
        jobs.values.forEach {
            try {
                cancelJob(it)
            } catch (e: Exception) {
                LOGGER.warn("failed to cancel a job during shutdown", e)
            }
        }

        PathUtils.deleteFileTree(downloadDir, true)
    }

    private fun prepareArgs(): MutableList<String> {
        return mutableListOf(
            "yt-dlp",

            "--quiet",
            "--progress",
            "--newline",
            "--progress-template", "download:%(progress._percent_str)s",

            "-o", "file.%(ext)s"
        )
    }

    private fun argsForFileFormat(format: FileType, args: MutableList<String>) {
        when(format) {
            FileType.MP3 -> args.addAll(listOf(
                "--extract-audio",
                "--audio-format", "mp3",
                "--embed-thumbnail"
            ))
            FileType.VIDEO -> {}
        }
    }

    /**
     * @return Pair<id, workingDir>
     */
    private fun allocJobId(): Pair<String, Path> {
        val idBytes = ByteArray(JOB_ID_BITS / 8)
        jobsLock.write {
            var id: String
            do {
                idRng.nextBytes(idBytes)
                id = JOB_ID_FORMATTER.formatHex(idBytes)
            } while(jobs.containsKey(id))

            val dir = downloadDir.resolve(id)
            Files.createDirectory(dir)

            jobs[id] = PLACEHOLDER_JOB
            return Pair(id, dir)
        }
    }

    private fun runJob(job: DownloadJob, cmd: List<String>) {
        // redirect error-stream into a file, as PIPE will be closed after the process exited
        val errFile = Files.createFile(job.workingDir.resolve("err.txt"))

        synchronized(job) {
            job.process = ProcessBuilder().apply {
                directory(job.workingDir.toFile())
                command(cmd)
                redirectError(errFile.toFile())
            }.start()

            job.state = DownloadJobState.STARTED
        }

        processExecutorService.submit {
            try {
                updateJobProgress(job)// blocks until process has ended

                val exitCode = job.process.waitFor()
                if(exitCode == 0) {
                    updateJobFinished(job)
                } else {
                    updateJobFailed(job, exitCode, errFile)
                }
            } catch(e: Exception) {
                LOGGER.error("exception while running yt-dlp", e)
                job.state = DownloadJobState.FAILED
            }

            jobsLock.write {
                jobs.remove(job.id)
            }
            PathUtils.deleteFileTree(job.workingDir, true)
        }
    }

    private fun updateJobProgress(job: DownloadJob) {
        job.process.inputReader().use {
            it.lineSequence().forEach { line ->
                val progressParts = PROGRESS_PATTERN.matchEntire(line.trim())
                if(progressParts != null) {
                    val phaseProgress: Double
                    try {
                        val percentStr = progressParts.groupValues[1]
                        phaseProgress = percentStr.toDouble() / 100
                    } catch(e: Exception) {
                        LOGGER.warn("unexpected line from yt-dlp:\n$line", e)
                        return@forEach// continue
                    }

                    // videos will have two download-phases: video and audio with their own progresses
                    if(job.downloadsVideo) {
                        if(job.inFirstDownloadPhase && phaseProgress < job.phaseLastProgress)
                            job.inFirstDownloadPhase = false
                        job.phaseLastProgress = phaseProgress

                        val firstPhasePart = 0.8// video-phase should make up of 80% of total download (very rough estimate)
                        if(job.inFirstDownloadPhase) {
                            val totalProgress = firstPhasePart * phaseProgress
                            job.progress = MathUtils.roundToDecimal(totalProgress, 4)
                                .coerceAtMost(0.99)// to prevent 100% while process is still running
                                .toFloat()
                        } else {
                            val totalProgress = firstPhasePart + ((1.0 - firstPhasePart) * phaseProgress)
                            job.progress = MathUtils.roundToDecimal(totalProgress, 4)
                                .coerceAtMost(0.99)// to prevent 100% while process is still running
                                .toFloat()
                        }
                    } else {
                        job.progress = MathUtils.roundToDecimal(phaseProgress, 4)
                            .coerceAtMost(0.99)// to prevent 100% while process is still running
                            .toFloat()
                    }
                } else {
                    LOGGER.warn("unexpected line from yt-dlp:\n$line")
                }
            }
        }
    }

    private fun updateJobFinished(job: DownloadJob) {
        // copy to dest and prepare extension report
        val downloaded = Files.list(job.workingDir).filter {
            it.nameWithoutExtension == "file"
        }.findAny().orElseThrow {
            FileNotFoundException("downloaded file is not present in workingDir")
        }
        Files.move(downloaded, job.destPath, StandardCopyOption.REPLACE_EXISTING)

        job.progress = 1.0f
        job.state = DownloadJobState.DONE

        job.listener?.onDone(downloaded.extension)
    }

    private fun updateJobFailed(job: DownloadJob, exitCode: Int, errFile: Path) {
        val errMsg =if(Files.exists(errFile)) {
            Files.readAllLines(errFile).joinToString("\n") {
                "    $it"
            }
        } else {
            // can happen when job was cancelled
            "    Error_Log unavailable"
        }
        LOGGER.error("download failed: yt-dl exited with code $exitCode")
        LOGGER.error(errMsg)

        if(job.state != DownloadJobState.CANCELLED)
            job.state = DownloadJobState.FAILED
    }

    private fun cancelJob(job: DownloadJob) {
        synchronized(job) {
            if (job.state == DownloadJobState.STARTED) {
                job.process.destroy()
            }

            job.state = DownloadJobState.CANCELLED
        }

        jobsLock.write {
            jobs.remove(job.id)
        }

        PathUtils.deleteFileTree(job.workingDir, true)
    }

    interface JobProgressListener {
        fun onUpdate(state: DownloadJobState, progress: Float)
        fun onDone(fileExtension: String)
    }

    private class DownloadJob(
        val id: String,
        val workingDir: Path,
        val destPath: Path,
        val downloadsVideo: Boolean
    ) {
        
        lateinit var process: Process
        var listener: JobProgressListener? = null

        // used to discern progress of video- and audio-download
        var inFirstDownloadPhase = true
        var phaseLastProgress = -1.0

        @Volatile
        var state: DownloadJobState = DownloadJobState.INIT
            set(value) {
                field = value
                notifyListener()
            }
        @Volatile
        var progress: Float = 0.0f
            set(value) {
                field = value
                notifyListener()
            }
        
        private fun notifyListener() {
            try {
                listener?.onUpdate(state, progress)
            } catch (e: Throwable) {
                LOGGER.error("JobProgressListener threw an exception", e)
            }
        }
    }
}
