package apps.chocolatecakecodes.invidious_ext.server.service

import apps.chocolatecakecodes.invidious_ext.server.constants.UserRoles
import apps.chocolatecakecodes.invidious_ext.server.entity.User
import apps.chocolatecakecodes.invidious_ext.server.repo.UserRepo
import apps.chocolatecakecodes.invidious_ext.server.service.exception.UserAlreadyExistsException
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.time.Instant
import kotlin.jvm.optionals.getOrElse
import org.springframework.security.core.userdetails.User as SpringUser

@Service
class UserService(
    @Autowired private val userRepo: UserRepo,
    @Autowired private val passwordEncoder: PasswordEncoder
) : UserDetailsService {

    override fun loadUserByUsername(username: String?): UserDetails {
        if(username == null)
            throw NullPointerException("username may not be null")

        val user = userRepo.findUserByName(username).getOrElse {
            throw UsernameNotFoundException("user '$username' does not exists")
        }

        // update lastOnline
        user.copy(lastOnline = Instant.now()).let {
            userRepo.save(it)
        }

        return SpringUser.withUsername(user.name)
            .password(user.password)
            .roles(UserRoles.USER)
            .build()
    }

    fun addNewUser(name: String, password: String) {
        if(userRepo.existsByName(name)) {
            throw UserAlreadyExistsException("username '$name' is already taken")
        }

        val passwordDigest = passwordEncoder.encode(password)
        val user = User(0, name, passwordDigest, Instant.now())
        userRepo.save(user)
    }
}
