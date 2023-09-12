package apps.chocolatecakecodes.invidious_ext.sync.repo

import apps.chocolatecakecodes.invidious_ext.sync.entity.InvidiousDataEntry
import apps.chocolatecakecodes.invidious_ext.sync.entity.User
import io.micronaut.data.annotation.Repository
import io.micronaut.data.jpa.repository.JpaRepository
import java.util.*

@Repository
interface InvidiousDataRepo : JpaRepository<InvidiousDataEntry, Long> {

    fun findByOwner(owner: User): Optional<InvidiousDataEntry>
}
