package apps.chocolatecakecodes.invidious_ext.sync.entity

import apps.chocolatecakecodes.invidious_ext.sync.entity.ExtensionDataEntry.Companion.CONSTRAINT_USER_KEY
import jakarta.persistence.*
import jakarta.validation.constraints.NotNull

@Entity
@Table(
    name = "extension_data",
    uniqueConstraints = [
        UniqueConstraint(name = CONSTRAINT_USER_KEY, columnNames = ["owner", "key"])
    ]
)
data class ExtensionDataEntry(
    @Id
    @GeneratedValue
    val id: Long,

    @ManyToOne(optional = false)
    @JoinColumn(name = "owner")
    @NotNull
    val owner: User,

    @NotNull
    @Column(length = 4096)
    val key: String,

    /** unix-time ms */
    @NotNull
    var lastSync: Long,

    @NotNull
    @Column(columnDefinition = "TEXT")
    var data: String
) {

    companion object {
        const val CONSTRAINT_USER_KEY = "unique_user_with_key"
    }
}
