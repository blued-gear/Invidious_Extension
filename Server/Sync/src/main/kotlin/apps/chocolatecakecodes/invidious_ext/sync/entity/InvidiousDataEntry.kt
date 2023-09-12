package apps.chocolatecakecodes.invidious_ext.sync.entity

import jakarta.persistence.*
import jakarta.validation.constraints.NotNull

@Entity
@Table(
    name = "invidious_data"
)
data class InvidiousDataEntry(
    @Id
    @GeneratedValue
    val id: Long,

    @ManyToOne(optional = false)
    @JoinColumn(name = "owner", nullable = false, unique = true)
    @NotNull
    val owner: User,

    /** unix-time ms */
    @NotNull
    var lastSync: Long,

    @NotNull
    @Column(length = 256, nullable = false)
    var hash: String,

    @NotNull
    @Column(columnDefinition = "TEXT", nullable = false)
    var data: String
)
