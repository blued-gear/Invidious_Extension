package apps.chocolatecakecodes.invidious_ext.sync.service

import apps.chocolatecakecodes.invidious_ext.sync.dto.DataPostDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.DataPutDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.KeyWithSyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.dto.SyncTimeDto
import apps.chocolatecakecodes.invidious_ext.sync.entity.ExtensionDataEntry
import apps.chocolatecakecodes.invidious_ext.sync.entity.User
import apps.chocolatecakecodes.invidious_ext.sync.repo.ExtensionDataRepo
import apps.chocolatecakecodes.invidious_ext.sync.service.exception.EntryOutOfSyncException
import apps.chocolatecakecodes.invidious_ext.sync.service.exception.ExtensionDataEntryAlreadyExistsException
import apps.chocolatecakecodes.invidious_ext.sync.service.exception.ExtensionDataEntryNotFoundException
import jakarta.inject.Inject
import jakarta.inject.Singleton
import jakarta.transaction.Transactional
import org.hibernate.exception.ConstraintViolationException
import org.slf4j.LoggerFactory
import java.time.Instant

@Singleton
class ExtensionDataService(
    @Inject private val repo: ExtensionDataRepo
) {

    private val logger = LoggerFactory.getLogger(ExtensionDataService::class.java)

    fun getLastSyncTime(user: User, key: String): SyncTimeDto {
        return loadEntry(user, key).let {
            SyncTimeDto(it.lastSync)
        }
    }

    fun getData(user: User, key: String): String {
        return loadEntry(user, key).data
    }

    fun getAllKeys(user: User): List<KeyWithSyncTimeDto> {
        return repo.findByOwner(user).map {
            KeyWithSyncTimeDto(it.key, it.lastSync)
        }
    }

    @Transactional
    fun addData(user: User, key: String, data: DataPostDto): KeyWithSyncTimeDto {
        val entry = ExtensionDataEntry(
            0,
            user,
            key,
            Instant.now().toEpochMilli(),
            data.data
        )

        try {
            val saved = repo.saveAndFlush(entry)
            return KeyWithSyncTimeDto(saved.key, saved.lastSync)
        } catch(e: ConstraintViolationException) {
            if(e.errorMessage.contains(ExtensionDataEntry.CONSTRAINT_USER_KEY))
                throw ExtensionDataEntryAlreadyExistsException(user.name, key)

            throw e
        }
    }

    @Transactional
    fun updateData(user: User, key: String, data: DataPutDto): SyncTimeDto {
        val entry = loadEntry(user, key)

        if(entry.lastSync > data.expectedLastSync) {
            throw EntryOutOfSyncException("stored entry '$key' is newer than supplied expectedLastSync")
        } else if(entry.lastSync < data.expectedLastSync) {
            logger.warn("expectedLastSync was in the past for entry user: '${user.name}', key: $key")
            throw EntryOutOfSyncException("stored entry '$key' does not meet supplied expectedLastSync")
        }

        entry.data = data.data
        entry.lastSync = Instant.now().toEpochMilli()
        repo.save(entry)

        return SyncTimeDto(entry.lastSync)
    }

    @Transactional
    fun deleteEntry(user: User, key: String) {
        val entry = loadEntry(user, key)
        repo.delete(entry)
    }

    private fun loadEntry(user: User, key: String): ExtensionDataEntry {
        return repo.findByOwnerAndKey(user, key).orElseThrow {
            ExtensionDataEntryNotFoundException(user.name, key)
        }
    }
}
