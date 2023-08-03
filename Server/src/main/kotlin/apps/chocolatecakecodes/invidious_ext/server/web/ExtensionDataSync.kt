package apps.chocolatecakecodes.invidious_ext.server.web

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/sync/extension")
class ExtensionDataSync {

    @GetMapping("test")
    fun test(): String {
        return "hello"
    }
}
