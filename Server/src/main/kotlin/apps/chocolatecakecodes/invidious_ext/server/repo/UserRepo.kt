package apps.chocolatecakecodes.invidious_ext.server.repo

import apps.chocolatecakecodes.invidious_ext.server.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface UserRepo : JpaRepository<User, Long> {

    fun findUserByName(name: String): Optional<User>
    fun existsByName(name: String): Boolean
}
