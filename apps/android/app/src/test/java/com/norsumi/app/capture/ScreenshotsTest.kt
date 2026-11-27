package com.norsumi.app.capture

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScreenshotsTest {
    @Test fun `detects common screenshot folders`() {
        assertTrue(Screenshots.isScreenshot("Pictures/Screenshots/", "Screenshot_20260101-101010.png"))
        assertTrue(Screenshots.isScreenshot("DCIM/Screenshots/", "Screenshot_20260101_101010_Instagram.jpg")) // Samsung
        assertTrue(Screenshots.isScreenshot("DCIM/screenshots/", "IMG_1.jpg"))
        assertTrue(Screenshots.isScreenshot("Pictures/ScreenCapture/", "a.png"))
    }

    @Test fun `detects by file name when the folder is unusual`() {
        assertTrue(Screenshots.isScreenshot("Pictures/", "Screenshot 2026-01-01 at 10.00.png"))
        assertTrue(Screenshots.isScreenshot(null, "screenshot_1.png"))
    }

    @Test fun `ignores camera photos and downloads`() {
        assertFalse(Screenshots.isScreenshot("DCIM/Camera/", "IMG_20260101_101010.jpg"))
        assertFalse(Screenshots.isScreenshot("Download/", "photo.png"))
        assertFalse(Screenshots.isScreenshot(null, null))
    }

    @Test fun `client id is stable`() {
        assertEquals("mediastore:42:1767225600", Screenshots.clientId(42, 1767225600))
    }

    private fun row(id: Long, pending: Boolean = false, path: String = "DCIM/Screenshots/", size: Long = 1000, mime: String = "image/png") =
        MediaRow(id, 0, "Screenshot_$id.png", path, mime, size, null, pending)

    @Test fun `watermark advances past finished rows`() {
        assertEquals(12, Screenshots.nextWatermark(10, listOf(row(11), row(12))))
    }

    @Test fun `watermark waits for pending rows`() {
        assertEquals(11, Screenshots.nextWatermark(10, listOf(row(11), row(12, pending = true), row(13))))
    }

    @Test fun `watermark never goes backwards`() {
        assertEquals(10, Screenshots.nextWatermark(10, emptyList()))
        assertEquals(10, Screenshots.nextWatermark(10, listOf(row(11, pending = true))))
    }

    @Test fun `uploadable filters pending, non-screenshots, oversized and unsupported`() {
        val rows = listOf(
            row(1), row(2, pending = true), row(3, path = "DCIM/Camera/").copy(displayName = "IMG.jpg"),
            row(4, size = 30L * 1024 * 1024), row(5, mime = "image/gif"),
        )
        assertEquals(listOf(1L), Screenshots.uploadable(rows).map { it.id })
    }
}
