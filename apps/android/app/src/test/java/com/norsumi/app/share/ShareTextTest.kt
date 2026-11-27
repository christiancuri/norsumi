package com.norsumi.app.share

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ShareTextTest {
    @Test fun `extracts first url and keeps the rest as text`() {
        val r = ShareText.parse("Check this thread https://x.com/user/status/123?s=20 so good") as SharedText.Link
        assertEquals("https://x.com/user/status/123?s=20", r.url)
        assertEquals("Check this thread so good", r.text)
    }

    @Test fun `url only has no text`() {
        val r = ShareText.parse("https://github.com/Kotlin/kotlinx.serialization") as SharedText.Link
        assertEquals("https://github.com/Kotlin/kotlinx.serialization", r.url)
        assertNull(r.text)
    }

    @Test fun `trailing punctuation is stripped`() {
        assertEquals("https://example.com/a", ShareText.firstUrl("see https://example.com/a."))
        assertEquals("https://example.com/a", ShareText.firstUrl("(https://example.com/a)"))
        assertEquals("https://en.wikipedia.org/wiki/Elephant_(disambiguation)", ShareText.firstUrl("https://en.wikipedia.org/wiki/Elephant_(disambiguation)!"))
        assertEquals("https://example.com/x", ShareText.firstUrl("“https://example.com/x”"))
    }

    @Test fun `picks the first of several urls`() {
        assertEquals("http://a.com", ShareText.firstUrl("http://a.com and https://b.com"))
    }

    @Test fun `bare www host is upgraded to https`() {
        val r = ShareText.parse("go to www.norsumi.com/docs now") as SharedText.Link
        assertEquals("https://www.norsumi.com/docs", r.url)
        assertEquals("go to now", r.text)
    }

    @Test fun `text without url becomes a note`() {
        assertEquals(SharedText.Note("buy oat milk"), ShareText.parse("  buy oat milk "))
    }

    @Test fun `subject becomes context of a link`() {
        val r = ShareText.parse("https://blog.example.com/post", "Great post title") as SharedText.Link
        assertEquals("Great post title", r.text)
    }

    @Test fun `empty share is ignored`() {
        assertNull(ShareText.parse("   ", null))
    }
}
