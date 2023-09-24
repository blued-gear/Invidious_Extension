package apps.chocolatecakecodes.invidious_ext.download.controller

import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadIdDto
import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadProgressDto
import apps.chocolatecakecodes.invidious_ext.download.dto.DownloadRequestDto
import apps.chocolatecakecodes.invidious_ext.download.dto.FileExtensionDto
import apps.chocolatecakecodes.invidious_ext.download.service.DownloadService
import io.micronaut.http.HttpStatus
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.*
import io.micronaut.security.annotation.Secured
import io.micronaut.security.rules.SecurityRule
import jakarta.inject.Inject
import jakarta.validation.Valid
import java.io.InputStream

@Controller("/download")
@Secured(SecurityRule.IS_AUTHENTICATED)
class DownloadController(
    @Inject private val downloadService: DownloadService
) {

    @Post
    @Status(HttpStatus.ACCEPTED)
    fun requestDownload(@Body @Valid options: DownloadRequestDto): DownloadIdDto {
        return DownloadIdDto(downloadService.requestDownload(options))
    }

    @Get("/progress")
    fun getProgress(@QueryValue id: String): DownloadProgressDto {
        return downloadService.downloadProgress(id)
    }

    @Get("/extension")
    fun getFileExtension(@QueryValue id: String): FileExtensionDto {
        return FileExtensionDto(downloadService.fileExtension(id))
    }

    @Get("/file")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    fun downloadFile(@QueryValue id: String): InputStream {
        return downloadService.downloadFile(id)
    }

    @Delete
    @Status(HttpStatus.NO_CONTENT)
    fun cancel(@QueryValue id: String) {
        downloadService.cancelDownload(id)
    }
}
