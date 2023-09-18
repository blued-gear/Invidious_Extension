package apps.chocolatecakecodes.invidious_ext.download.entity

import apps.chocolatecakecodes.invidious_ext.download.service.FileService
import jakarta.persistence.*
import jakarta.validation.constraints.NotNull
import java.time.Instant

@Entity
@Table(name = "stored_file")
data class StoredFile(
    @Id
    @GeneratedValue
    val id: Long,

    @NotNull
    @Column(unique = true, nullable = false, length = FileService.PUBLIC_ID_BITS / 4)
    val publicId: String,

    @NotNull
    val created: Instant,

    @NotNull
    @Column(unique = true, nullable = false)
    val path: String
)
