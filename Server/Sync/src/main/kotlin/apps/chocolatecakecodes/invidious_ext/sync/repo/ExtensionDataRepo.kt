package apps.chocolatecakecodes.invidious_ext.sync.repo

import apps.chocolatecakecodes.invidious_ext.sync.entity.ExtensionDataEntry
import apps.chocolatecakecodes.invidious_ext.sync.entity.User
import io.micronaut.data.annotation.Repository
import io.micronaut.data.jpa.repository.JpaRepository
import java.util.*

@Repository
interface ExtensionDataRepo : JpaRepository<ExtensionDataEntry, Long> {

    fun findByOwner(owner: User): List<ExtensionDataEntry>
    fun findByOwnerAndKey(owner: User, key: String): Optional<ExtensionDataEntry>
}
