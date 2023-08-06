package apps.chocolatecakecodes.invidious_ext.sync.controller

import apps.chocolatecakecodes.invidious_ext.sync.dto.DataPostDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.DataPutDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.KeyWithSyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.service.ExtensionDataService
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import io.micronaut.http.HttpStatus
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.*
import io.micronaut.security.annotation.Secured
import io.micronaut.security.rules.SecurityRule
import jakarta.inject.Inject
import java.security.Principal

@Controller("/sync/extension")
@Secured(SecurityRule.IS_AUTHENTICATED)
class ExtensionDataSyncController(
    @Inject private val userService: UserService,
    @Inject private val extensionDataService: ExtensionDataService
) {

    @Get("entry/{key}/lastSyncTime")
    fun getLastSyncTime(@PathVariable key: String, principal: Principal): SyncTimeDto {
        val user = userService.loadUser(principal.name)
        return extensionDataService.getLastSyncTime(user, key)
    }

    @Get("entry/{key}/data")
    @Produces(MediaType.TEXT_PLAIN)
    fun getData(@PathVariable key: String, principal: Principal): String {
        val user = userService.loadUser(principal.name)
        return extensionDataService.getData(user, key)
    }

    @Get("allKeys")
    fun getAllKeys(principal: Principal): List<KeyWithSyncTimeDto> {
        val user = userService.loadUser(principal.name)
        return extensionDataService.getAllKeys(user)
    }

    @Post("entry/{key}/data")
    @Status(HttpStatus.CREATED)
    fun addData(@PathVariable key: String, @Body data: DataPostDto, principal: Principal): KeyWithSyncTimeDto {
        val user = userService.loadUser(principal.name)
        return extensionDataService.addData(user, key, data)
    }

    @Put("entry/{key}/data")
    fun updateData(@PathVariable key: String, @Body data: DataPutDto, principal: Principal): SyncTimeDto {
        val user = userService.loadUser(principal.name)
        return extensionDataService.updateData(user, key, data)
    }

    @Delete("entry/{key}")
    @Status(HttpStatus.NO_CONTENT)
    fun deleteEntry(@PathVariable key: String, principal: Principal) {
        val user = userService.loadUser(principal.name)
        return extensionDataService.deleteEntry(user, key)
    }
}
