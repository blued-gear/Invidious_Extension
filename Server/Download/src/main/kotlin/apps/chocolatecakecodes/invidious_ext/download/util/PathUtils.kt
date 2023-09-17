package apps.chocolatecakecodes.invidious_ext.download.util

import java.nio.file.Files
import java.nio.file.Path

object PathUtils {

    fun deleteFileTree(root: Path, includeRoot: Boolean) {
        if(!Files.exists(root))
            return

        if(Files.isDirectory(root)) {
            Files.list(root).forEach {
                deleteFileTree(it, true)
            }

            if(includeRoot) {
                Files.delete(root)
            }
        } else {
            Files.delete(root)
        }
    }
}
