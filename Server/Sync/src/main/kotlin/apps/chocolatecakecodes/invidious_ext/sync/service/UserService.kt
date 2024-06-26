package apps.chocolatecakecodes.invidious_ext.sync.service

import apps.chocolatecakecodes.invidious_ext.sync.entity.User
import apps.chocolatecakecodes.invidious_ext.sync.repo.UserRepo
import apps.chocolatecakecodes.invidious_ext.sync.service.exception.UserAlreadyExistsException
import apps.chocolatecakecodes.invidious_ext.sync.service.exception.UsernameNotFoundException
import apps.chocolatecakecodes.invidious_ext.util.crypto.PasswordEncoder
import jakarta.inject.Inject
import jakarta.inject.Singleton
import jakarta.transaction.Transactional
import java.time.Instant
import kotlin.jvm.optionals.getOrElse

@Singleton
class UserService(
    @Inject private val userRepo: UserRepo,
    @Inject private val passwordEncoder: PasswordEncoder
) {

    @Transactional
    fun loadUser(username: String?): User {
        if(username == null)
            throw NullPointerException("username may not be null")

        val user = userRepo.findByName(username).getOrElse {
            throw UsernameNotFoundException()
        }

        // update lastOnline
        user.lastOnline = Instant.now()
        userRepo.save(user)

        return user
    }

    @Transactional
    fun addNewUser(name: String, password: String): User {
        if(userRepo.existsByName(name)) {
            throw UserAlreadyExistsException("username '$name' is already taken")
        }

        val passwordDigest = passwordEncoder.encode(password)
        val user = User(0, name, passwordDigest, Instant.now())

        return userRepo.save(user)
    }

    @Transactional
    fun upgradePasswordIfNecessary(user: User, password: String) {
        if(!passwordEncoder.upgradeEncoding(user.password))
            return

        user.password = passwordEncoder.encode(password)
        userRepo.save(user)
    }
}
