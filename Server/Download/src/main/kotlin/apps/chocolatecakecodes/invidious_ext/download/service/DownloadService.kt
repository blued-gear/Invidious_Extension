package apps.chocolatecakecodes.invidious_ext.download.service

import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadProgressDto
import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadRequestDto
import apps.chocolatecakecodes.invidious_ext.download.enums.DownloadJobState
import apps.chocolatecakecodes.invidious_ext.download.service.exception.InvalidDownloadOptionsException
import apps.chocolatecakecodes.invidious_ext.download.service.exception.JobFailedException
import apps.chocolatecakecodes.invidious_ext.download.service.exception.JobNotFoundException
import apps.chocolatecakecodes.invidious_ext.download.service.exception.JobRunningException
import io.micronaut.scheduling.annotation.Scheduled
import jakarta.inject.Inject
import jakarta.inject.Named
import jakarta.inject.Singleton
import org.slf4j.LoggerFactory
import java.io.InputStream
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.concurrent.ExecutorService
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

@Singleton
class DownloadService(
    @Inject private val fileService: FileService,
    @Inject private val downloader: YoutubeDlpService,
    @Inject private val tagger: TaggingService,
    @Inject @Named("downloaderThreadPool") private val executorService: ExecutorService
) {

    companion object {
        private const val DEST_SUBDIR = "finished"
        private const val MAX_FINISHED_JOB_AGE_HOURS = 1
        private const val MAX_JOB_AGE_HOURS = 8

        private val LOGGER = LoggerFactory.getLogger(DownloadService::class.java)
    }

    private val jobs: MutableMap<String, DownloadJob> = HashMap()
    private val jobsLock = ReentrantReadWriteLock()

    fun requestDownload(req: DownloadRequestDto): String {
        validateOptions(req)

        val destFile = fileService.newFile(DEST_SUBDIR)
        val jobId = destFile.publicId

        val job = DownloadJob(
            jobId,
            destFile.publicId,
            req,
            Instant.now(),
            DownloadProgressDto(jobId, DownloadJobState.INIT, 0.0f),
            null,
            "",// to set it as running
            false
        )
        jobsLock.write {
            if(jobs.put(jobId, job) != null)
              LOGGER.error("duplicate job-id; previous job was removed")
        }

        val progressListener = object : YoutubeDlpService.JobProgressListener {
            override fun onUpdate(state: DownloadJobState, progress: Float) {
                onDownloadProgressUpdate(job, state, progress)
            }
            override fun onDone(fileExtension: String) {
                onDownloadDone(job, fileExtension)
            }
        }
        job.downloaderId = downloader.startJob(req, destFile.path, progressListener)

        return jobId
    }

    fun downloadProgress(id: String): DownloadProgressDto {
        val job = jobsLock.read {
            jobs[id]
        } ?: throw JobNotFoundException(id)

        return job.lastProgress
    }

    fun fileExtension(id: String): String? {
        val job = jobsLock.read {
            jobs[id]
        } ?: throw JobNotFoundException(id)

        return job.resultedExtension
    }

    fun downloadFile(id: String): InputStream {
        val job = jobsLock.read {
            jobs[id]
        } ?: throw JobNotFoundException(id)

        if(job.isRunning)
            throw JobRunningException(job.id)
        if(job.lastProgress.state != DownloadJobState.DONE)
            throw JobFailedException(job.id)

        return fileService.getContent(job.destFileId)
    }

    fun cancelDownload(id: String) {
        val job = jobsLock.read {
            jobs[id]
        } ?: throw JobNotFoundException(id)

        cancelJob(job)
    }

    @Scheduled(fixedRate = "${MAX_FINISHED_JOB_AGE_HOURS}h", initialDelay = "${MAX_FINISHED_JOB_AGE_HOURS}h")
    fun cleanOldJobs() {
        jobsLock.write {
            val minUpdateTime = Instant.now().minus(MAX_FINISHED_JOB_AGE_HOURS.toLong(), ChronoUnit.HOURS)
            val minUpdateTimeUnfinished = Instant.now().minus(MAX_JOB_AGE_HOURS.toLong(), ChronoUnit.HOURS)

            jobs.values.filter {
                (!it.isRunning && it.updated.isBefore(minUpdateTime))
                        || it.updated.isBefore(minUpdateTimeUnfinished)
            }.forEach {
                cancelJob(it)
            }
        }
    }

    private fun validateOptions(req: DownloadRequestDto) {
        if(req.destType.supportTags) {
            if(req.tags === null)
                throw InvalidDownloadOptionsException("tags may not be null on MP3")
        } else {
            if(req.tags !== null)
                throw InvalidDownloadOptionsException("tags must be null on VIDEO")
        }
    }

    private fun proceedWithTagging(job: DownloadJob) {
        job.isTaggerRunning = true

        executorService.submit {
            try {
                val file = fileService.getPath(job.destFileId)
                tagger.tagFile(file, job.options)

                job.updated = Instant.now()
                job.isTaggerRunning = false
                job.lastProgress = DownloadProgressDto(
                    job.id,
                    DownloadJobState.DONE,
                    1.0f
                )
            } catch(e: Exception) {
                LOGGER.error("tagging failed", e)

                job.updated = Instant.now()
                job.isTaggerRunning = false
                job.lastProgress = DownloadProgressDto(
                    job.id,
                    DownloadJobState.FAILED,
                    job.lastProgress.progress
                )
            }
        }
    }

    private fun onDownloadProgressUpdate(job: DownloadJob, state: DownloadJobState, progress: Float) {
        job.updated = Instant.now()

        // tagging will also take some time, so report progress no more than 98%
        job.lastProgress = if(job.willTag) {
            DownloadProgressDto(
                job.id,
                if (state === DownloadJobState.DONE) DownloadJobState.STARTED else state,
                progress.coerceAtMost(0.98f)
            )
        } else {
            DownloadProgressDto(
                job.id,
                state,
                if (state == DownloadJobState.DONE) 1.0f else progress
            )
        }
    }

    private fun onDownloadDone(job: DownloadJob, extension: String) {
        job.resultedExtension = extension

        if(job.willTag) {
            proceedWithTagging(job)
        }

        job.downloaderId = null
    }

    private fun cancelJob(job: DownloadJob) {
        if(job.isDownloadRunning) {
            downloader.cancelJob(job.downloaderId!!)
            job.downloaderId = null
        }

        fileService.deleteFile(job.destFileId)

        job.updated = Instant.now()
        job.lastProgress = DownloadProgressDto(
            job.id,
            DownloadJobState.CANCELLED,
            job.lastProgress.progress
        )

        jobsLock.write {
            jobs.remove(job.id)
        }
    }

    private class DownloadJob(
        val id: String,
        val destFileId: String,
        val options: DownloadRequestDto,
        @Volatile var updated: Instant,
        @Volatile var lastProgress: DownloadProgressDto,
        @Volatile var resultedExtension: String? = null,
        @Volatile var downloaderId: String? = null,
        @Volatile var isTaggerRunning: Boolean = false
    ) {

        val isDownloadRunning: Boolean
            get() = downloaderId != null
        val isRunning
            get() = isDownloadRunning || isTaggerRunning

        val willTag: Boolean
            get() = !options.tags.isNullOrEmpty()
    }
}
