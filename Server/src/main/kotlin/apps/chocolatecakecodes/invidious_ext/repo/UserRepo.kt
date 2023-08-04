package apps.chocolatecakecodes.invidious_ext.repo

import apps.chocolatecakecodes.invidious_ext.entity.User
import io.micronaut.data.annotation.Repository
import io.micronaut.data.jpa.repository.JpaRepository
import java.util.*

@Repository
interface UserRepo : JpaRepository<User, Long> {

    fun findByName(name: String): Optional<User>
    fun existsByName(name: String): Boolean
}
