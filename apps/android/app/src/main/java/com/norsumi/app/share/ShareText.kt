package com.norsumi.app.share

/** What a `text/plain` share turns into. */
sealed interface SharedText {
    data class Link(val url: String, val text: String?) : SharedText
    data class Note(val text: String) : SharedText
}

object ShareText {
    private val URL = Regex("""(?i)\bhttps?://[^\s<>"'`]+""")
    private val BARE_WWW = Regex("""(?i)\bwww\.[a-z0-9-]+(\.[a-z0-9-]+)+[^\s<>"'`]*""")
    private const val TRAILING = ".,;:!?'\"*_>”’»…"

    /** First http(s) URL in [text] (or a bare `www.` host, upgraded to https), cleaned of trailing punctuation. */
    fun firstUrl(text: String): String? {
        val match = URL.find(text)?.value ?: BARE_WWW.find(text)?.value?.let { "https://$it" } ?: return null
        return trimTrailing(match)
    }

    private fun trimTrailing(url: String): String {
        var u = url
        while (u.isNotEmpty()) {
            val last = u.last()
            u = when {
                last in TRAILING -> u.dropLast(1)
                last == ')' && u.count { it == '(' } < u.count { it == ')' } -> u.dropLast(1)
                last == ']' && u.count { it == '[' } < u.count { it == ']' } -> u.dropLast(1)
                else -> return u
            }
        }
        return u
    }

    /**
     * Turns shared text into a link (with the remaining text as context, e.g. a tweet) or a note.
     * [subject] is `EXTRA_SUBJECT`, often the page title.
     */
    fun parse(text: String?, subject: String? = null): SharedText? {
        val body = text?.trim().orEmpty()
        val subj = subject?.trim().orEmpty()
        if (body.isEmpty() && subj.isEmpty()) return null
        val url = firstUrl(body) ?: firstUrl(subj)
        if (url == null) {
            val note = listOf(subj, body).filter { it.isNotEmpty() }.distinct().joinToString("\n\n")
            return SharedText.Note(note)
        }
        // A bare "www." match appears in the text without the scheme we added.
        val asWritten = if (body.contains(url)) url else url.removePrefix("https://")
        val rest = body.replace(asWritten, " ")
            .lines().joinToString("\n") { it.trim().replace(Regex("\\s{2,}"), " ") }
            .replace(Regex("\n{3,}"), "\n\n").trim()
        val context = listOf(subj.takeIf { it.isNotEmpty() && !rest.contains(it) && it != url }, rest.takeIf { it.isNotEmpty() })
            .filterNotNull().joinToString("\n\n")
        return SharedText.Link(url, context.ifEmpty { null })
    }
}
