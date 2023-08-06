package apps.chocolatecakecodes.invidious_ext.sync.entity

import jakarta.persistence.*
import jakarta.validation.constraints.NotNull
import java.time.Instant

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue
    val id: Long,

    @Column(unique = true, nullable = false)
    var name: String,

    @NotNull
    var password: String,

    @NotNull
    var lastOnline: Instant
)
