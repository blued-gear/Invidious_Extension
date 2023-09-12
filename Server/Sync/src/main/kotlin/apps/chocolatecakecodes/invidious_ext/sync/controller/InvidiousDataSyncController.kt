package apps.chocolatecakecodes.invidious_ext.sync.controller

import apps.chocolatecakecodes.invidious_ext.sync.dto.InvDataUpdateDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeWithHashDto
import apps.chocolatecakecodes.invidious_ext.sync.service.InvidiousDataService
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import io.micronaut.http.HttpStatus
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.*
import io.micronaut.security.annotation.Secured
import io.micronaut.security.rules.SecurityRule
import jakarta.inject.Inject
import java.security.Principal

@Controller("/sync/invidious")
@Secured(SecurityRule.IS_AUTHENTICATED)
class InvidiousDataSyncController(
    @Inject private val userService: UserService,
    @Inject private val invidiousDataService: InvidiousDataService
) {

    @Get("lastSyncTime")
    fun getLastSyncTime(principal: Principal): SyncTimeWithHashDto {
        val user = userService.loadUser(principal.name)
        return invidiousDataService.getLastSyncTime(user)
    }

    @Get("data")
    @Produces(MediaType.TEXT_PLAIN)
    fun getData(principal: Principal): String {
        val user = userService.loadUser(principal.name)
        return invidiousDataService.getData(user)
    }

    @Put("data")
    fun updateData(@Body data: InvDataUpdateDto, principal: Principal): SyncTimeDto {
        val user = userService.loadUser(principal.name)
        return invidiousDataService.updateData(user, data)
    }

    @Delete("data")
    @Status(HttpStatus.NO_CONTENT)
    fun deleteData(principal: Principal) {
        val user = userService.loadUser(principal.name)
        return invidiousDataService.deleteData(user)
    }
}
