package apps.chocolatecakecodes.invidious_ext.sync.service

import apps.chocolatecakecodes.invidious_ext.sync.dto.InvDataUpdateDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeWithHashDto
import apps.chocolatecakecodes.invidious_ext.sync.entity.InvidiousDataEntry
import apps.chocolatecakecodes.invidious_ext.sync.entity.User
import apps.chocolatecakecodes.invidious_ext.sync.repo.InvidiousDataRepo
import apps.chocolatecakecodes.invidious_ext.sync.service.exception.EntryOutOfSyncException
import apps.chocolatecakecodes.invidious_ext.sync.service.exception.InvidiousDataEntryNotFoundException
import jakarta.inject.Inject
import jakarta.inject.Singleton
import jakarta.transaction.Transactional
import org.slf4j.LoggerFactory
import java.time.Instant
import kotlin.jvm.optionals.getOrElse

@Singleton
class InvidiousDataService(
    @Inject private val repo: InvidiousDataRepo
) {

    private val logger = LoggerFactory.getLogger(InvidiousDataService::class.java)

    fun getLastSyncTime(user: User): SyncTimeWithHashDto {
        return loadEntry(user).let {
            SyncTimeWithHashDto(it.lastSync, it.hash)
        }
    }

    fun getData(user: User): String {
        return loadEntry(user).data
    }

    @Transactional
    fun updateData(user: User, data: InvDataUpdateDto): SyncTimeDto {
        val entry = repo.findByOwner(user).getOrElse {
            InvidiousDataEntry(0, user, data.expectedLastSync, "", "")
        }

        if(!data.force) {
            if(entry.lastSync > data.expectedLastSync) {
                throw EntryOutOfSyncException("stored data is newer than supplied expectedLastSync")
            } else if(entry.lastSync < data.expectedLastSync) {
                logger.warn("expectedLastSync was in the past user: '${user.name}'")
                throw EntryOutOfSyncException("stored data does not meet supplied expectedLastSync")
            }
        }

        entry.data = data.data
        entry.hash = data.hash
        entry.lastSync = Instant.now().toEpochMilli()
        repo.save(entry)

        return SyncTimeDto(entry.lastSync)
    }

    @Transactional
    fun deleteData(user: User) {
        val entry = repo.findByOwner(user)
        if(entry.isPresent)
            repo.delete(entry.get())
    }

    private fun loadEntry(user: User): InvidiousDataEntry {
        return repo.findByOwner(user).orElseThrow {
            InvidiousDataEntryNotFoundException(user.name)
        }
    }
}
