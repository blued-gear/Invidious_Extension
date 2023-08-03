package apps.chocolatecakecodes.invidious_ext.server.entity

import jakarta.persistence.*
import org.jetbrains.annotations.NotNull
import java.time.Instant

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue
    val id: Long,
    @Column(unique = true, nullable = false)
    val name: String,
    @NotNull
    val password: String,
    @NotNull
    val lastOnline: Instant
) {}
