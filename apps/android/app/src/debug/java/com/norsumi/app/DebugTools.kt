package com.norsumi.app

import okhttp3.Interceptor
import okhttp3.logging.HttpLoggingInterceptor

/** Debug builds log request lines and headers (never bodies: they carry passwords and tokens). */
object DebugTools {
    fun networkInterceptors(): List<Interceptor> = listOf(
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
            redactHeader("Authorization")
        },
    )
}
