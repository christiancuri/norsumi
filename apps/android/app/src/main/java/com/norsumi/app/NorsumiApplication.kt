package com.norsumi.app

import android.app.Application
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.disk.DiskCache
import coil3.disk.directory
import coil3.memory.MemoryCache
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import coil3.request.crossfade
import com.norsumi.app.capture.Notifications
import kotlinx.coroutines.launch

class NorsumiApplication : Application(), SingletonImageLoader.Factory {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        Notifications.createChannels(this)
        container.scope.launch {
            container.session.awaitReady()
            if (container.settings.current.autoCapture && container.session.isSignedIn) container.scheduler.arm()
        }
    }

    override fun newImageLoader(context: PlatformContext): ImageLoader = ImageLoader.Builder(context)
        // Media URLs are pre-signed: no auth header, plain client.
        .components { add(OkHttpNetworkFetcherFactory(callFactory = { container.http })) }
        .memoryCache { MemoryCache.Builder().maxSizePercent(context, 0.25).build() }
        .diskCache { DiskCache.Builder().directory(cacheDir.resolve("images")).maxSizeBytes(256L * 1024 * 1024).build() }
        .crossfade(true)
        .build()
}
