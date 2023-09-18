package apps.chocolatecakecodes.invidious_ext.download.config

import io.micronaut.context.annotation.Bean
import io.micronaut.context.annotation.Factory
import jakarta.inject.Named
import jakarta.inject.Singleton
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@Factory
class DownloaderThreadPoolConfig {

    @Singleton
    @Bean(preDestroy = "shutdownNow")
    @Named("downloaderThreadPool")
    fun downloaderThreadPool(): ExecutorService {
        return Executors.unconfigurableExecutorService(Executors.newCachedThreadPool())
    }
}
