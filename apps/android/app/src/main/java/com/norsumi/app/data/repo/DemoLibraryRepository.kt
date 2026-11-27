package com.norsumi.app.data.repo

import android.content.Context
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.CategoryRef
import com.norsumi.app.data.model.Field
import com.norsumi.app.data.model.Item
import com.norsumi.app.data.model.ItemEntity
import com.norsumi.app.data.model.ItemImage
import com.norsumi.app.data.model.ItemKind
import com.norsumi.app.data.model.ItemLink
import com.norsumi.app.data.model.ItemListResponse
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.ItemQuery
import com.norsumi.app.data.model.ItemStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

/** Debug-only in-memory library with synthetic content, for UI work without the API. */
class DemoLibraryRepository(context: Context) : BaseLibraryRepository() {
    private val images = DemoImages(context.applicationContext)
    private var seeded = false
    private val categories = mutableListOf<Category>()
    private val items = mutableListOf<Item>()

    private suspend fun ensureSeeded() {
        if (seeded) return
        withContext(Dispatchers.IO) { seed() }
        seeded = true
    }

    override suspend fun items(query: ItemQuery, cursor: String?): ItemListResponse {
        ensureSeeded()
        delay(250)
        promotePending()
        val childIds = query.categoryId?.let { id -> categories.filter { it.parentId == id }.map { it.id } + id }
        val q = query.q?.trim()?.lowercase()
        val list = items.filter { item ->
            (query.kinds.isEmpty() || item.kind in query.kinds) &&
                (query.favorite == null || item.favorite == query.favorite) &&
                (item.archived == (query.archived ?: false)) &&
                (childIds == null || item.categoryId in childIds) &&
                (q.isNullOrEmpty() || listOf(item.title, item.summary, item.text.orEmpty(), item.tags.joinToString(" "), item.source.orEmpty())
                    .any { it.lowercase().contains(q) })
        }
        return ItemListResponse(list, null)
    }

    override suspend fun item(id: String): Item {
        ensureSeeded()
        promotePending()
        return items.first { it.id == id }
    }

    override suspend fun update(id: String, patch: ItemPatch): Item {
        val i = items.indexOfFirst { it.id == id }
        var item = items[i]
        patch.title?.let { item = item.copy(title = it) }
        patch.summary?.let { item = item.copy(summary = it) }
        patch.note?.let { item = item.copy(note = (it as? Field.Set)?.value) }
        patch.tags?.let { item = item.copy(tags = it) }
        patch.favorite?.let { item = item.copy(favorite = it) }
        patch.archived?.let { item = item.copy(archived = it) }
        patch.categoryId?.let { f ->
            val id2 = (f as? Field.Set)?.value
            item = item.copy(categoryId = id2, categoryPath = pathOf(id2))
        }
        items[i] = item
        emit(LibraryChange.Updated(item))
        return item
    }

    override suspend fun delete(id: String) {
        items.removeAll { it.id == id }
        emit(LibraryChange.Deleted(id))
    }

    override suspend fun reprocess(id: String): Item {
        val i = items.indexOfFirst { it.id == id }
        items[i] = items[i].copy(status = ItemStatus.Processing, updatedAt = Instant.now().toString())
        emit(LibraryChange.Updated(items[i]))
        return items[i]
    }

    override suspend fun createNote(text: String): Item = add(
        Item(id = newId(), kind = ItemKind.Note, status = ItemStatus.Pending, text = text, capturedAt = now(), updatedAt = now()),
    )

    override suspend fun createLink(url: String, text: String?): Item = add(
        Item(
            id = newId(), kind = ItemKind.Link, status = ItemStatus.Pending, text = text, capturedAt = now(), updatedAt = now(),
            link = ItemLink(url = url, domain = runCatching { java.net.URI(url).host.removePrefix("www.") }.getOrDefault(url)),
        ),
    )

    override suspend fun categories(): List<Category> {
        ensureSeeded()
        return categories.map { c -> c.copy(itemCount = items.count { it.categoryId == c.id && !it.archived }) }
    }

    override suspend fun updateCategory(id: String, patch: CategoryPatch): Category {
        val i = categories.indexOfFirst { it.id == id }
        var c = categories[i]
        patch.name?.let { c = c.copy(name = it) }
        patch.emoji?.let { c = c.copy(emoji = it) }
        patch.color?.let { c = c.copy(color = it) }
        categories[i] = c
        emit(LibraryChange.CategoriesChanged)
        return c
    }

    override suspend fun deleteCategory(id: String) {
        val ids = categories.filter { it.id == id || it.parentId == id }.map { it.id }.toSet()
        categories.removeAll { it.id in ids }
        items.replaceAll { if (it.categoryId in ids) it.copy(categoryId = null, categoryPath = emptyList()) else it }
        emit(LibraryChange.CategoriesChanged)
    }

    private fun add(item: Item): Item {
        items.add(0, item)
        emit(LibraryChange.Created)
        return item
    }

    /** Pending items "finish thinking" a few seconds later so the shimmer is visible. */
    private fun promotePending() {
        val cutoff = Instant.now().minusSeconds(7)
        items.replaceAll { item ->
            if (item.status.isWorking && Instant.parse(item.updatedAt.ifEmpty { now() }).isBefore(cutoff)) {
                val leaf = categories.first { it.name == "Ideas" }
                item.copy(
                    status = ItemStatus.Ready,
                    title = item.title.ifEmpty { item.text?.lineSequence()?.firstOrNull()?.take(60) ?: item.link?.domain ?: "Saved item" },
                    summary = item.summary.ifEmpty { "Organized by norsumi." },
                    categoryId = item.categoryId ?: leaf.id,
                    categoryPath = item.categoryPath.ifEmpty { pathOf(leaf.id) },
                )
            } else item
        }
    }

    private fun pathOf(id: String?): List<CategoryRef> {
        val leaf = categories.firstOrNull { it.id == id } ?: return emptyList()
        val root = categories.firstOrNull { it.id == leaf.parentId }
        return listOfNotNull(root, leaf).map { CategoryRef(it.id, it.name, it.emoji, it.color) }
    }

    private fun cat(name: String, emoji: String, color: String, parent: String? = null, description: String? = null): String {
        val id = "cat-" + name.lowercase().replace(" ", "-") + (parent?.let { "-$it" } ?: "")
        categories += Category(id = id, name = name, slug = name.lowercase(), parentId = parent, emoji = emoji, color = color, description = description)
        return id
    }

    private fun seed() {
        val ig = cat("Instagram", "📸", "rose", description = "Posts and reels you saved from Instagram")
        val igFood = cat("Restaurants", "🍝", "orange", ig, "Places to eat, from pizza to omakase")
        val igTravel = cat("Travel", "✈️", "sky", ig, "Trips and spots to visit")
        val x = cat("X", "🐦", "slate", description = "Threads and posts from X")
        val xAi = cat("AI", "🤖", "violet", x, "Models, papers and prompts")
        val xDesign = cat("Design", "🎨", "fuchsia", x)
        val web = cat("Web", "🌐", "blue", description = "Articles and sites")
        val webDev = cat("Dev", "🛠️", "teal", web, "Libraries, repos and docs")
        val wa = cat("WhatsApp", "💬", "emerald", description = "Chats worth remembering")
        val waPlans = cat("Plans", "🗓️", "lime", wa)
        val notes = cat("Notes", "📝", "amber")
        cat("Ideas", "💡", "amber", notes)

        var minutes = 0L
        fun ts() = Instant.now().minus(minutes.also { minutes += 97 }, ChronoUnit.MINUTES).toString()
        fun shot(
            app: String, accent: String, headline: String, title: String, summary: String, cat: String, tags: List<String>,
            entities: List<ItemEntity> = emptyList(), dark: Boolean = false, h: Int = 1170, fav: Boolean = false,
            status: ItemStatus = ItemStatus.Ready,
        ) {
            val url = images.screenshot(app, accent, headline, dark, h = h)
            items += Item(
                id = newId(), kind = ItemKind.Screenshot, status = status,
                title = if (status.isWorking) "" else title, summary = if (status.isWorking) "" else summary, source = app.replaceFirstChar { it.uppercase() },
                categoryId = if (status.isWorking) null else cat, categoryPath = if (status.isWorking) emptyList() else pathOf(cat), tags = tags, entities = entities,
                text = "$headline\n$summary", image = ItemImage(540, h, accent, "image/png", 120_000, url, url), favorite = fav,
                capturedAt = ts(), createdAt = now(), updatedAt = now(),
            )
        }

        shot("instagram", "#E1306C", "New in town", "", "", igFood, emptyList(), status = ItemStatus.Processing)
        shot(
            "instagram", "#F97316", "The best pizza in São Paulo", "Bráz Elettrica — wood-fired pizza",
            "A Neapolitan-style pizzeria in Pinheiros praised for its margherita and long natural fermentation.", igFood,
            listOf("pizza", "são paulo", "dinner"),
            listOf(
                ItemEntity("place", "Bráz Elettrica", "R. Vupabussu, 271 — Pinheiros", "https://maps.google.com/?q=Br%C3%A1z+Elettrica"),
                ItemEntity("account", "@brazelettrica", null, "https://instagram.com/brazelettrica"),
                ItemEntity("price", "R$ 89", "per pizza", null),
            ),
            fav = true,
        )
        shot(
            "x", "#7C3AED", "A thread on small language models", "Why small models are catching up",
            "A thread comparing distilled 3B models against frontier models on everyday tasks, with benchmark charts.", xAi,
            listOf("llm", "benchmarks"), listOf(ItemEntity("account", "@karpathy", null, "https://x.com/karpathy")), dark = true, h = 980,
        )
        items += Item(
            id = newId(), kind = ItemKind.Link, title = "Jetpack Compose performance best practices",
            summary = "Stable keys, contentType, deferred reads and baseline profiles: a checklist for 120Hz lists.",
            source = "developer.android.com", categoryId = webDev, categoryPath = pathOf(webDev), tags = listOf("android", "compose"),
            link = ItemLink(
                "https://developer.android.com/develop/ui/compose/performance", "developer.android.com", "Android Developers",
                "Compose performance", "Follow these best practices", null, images.cover("compose", "#3DDC84"),
            ),
            capturedAt = ts(), updatedAt = now(),
        )
        shot(
            "instagram", "#0EA5E9", "Lençóis Maranhenses in July", "Lençóis Maranhenses lagoons",
            "Best time to visit is June–September when the lagoons are full. Fly into São Luís, then 4h to Barreirinhas.", igTravel,
            listOf("brazil", "travel", "dunes"), listOf(ItemEntity("place", "Lençóis Maranhenses", "Maranhão, Brazil", "https://maps.google.com/?q=Len%C3%A7%C3%B3is+Maranhenses")), h = 1080,
        )
        items += Item(
            id = newId(), kind = ItemKind.Note, title = "Gift ideas for Ana",
            summary = "A short list of birthday gift ideas.", categoryId = categories.first { it.name == "Ideas" }.id,
            categoryPath = pathOf(categories.first { it.name == "Ideas" }.id), tags = listOf("gifts"),
            text = "Gift ideas for Ana\nFilm camera (Olympus mu-ii)\nCeramics class for two\nThat bookstore in Vila Madalena",
            capturedAt = ts(), updatedAt = now(),
        )
        shot(
            "whatsapp", "#16A34A", "Saturday: trail at 7am", "Saturday hike — Pico do Jaraguá",
            "Group plan: meet at the park entrance at 7am, bring water and sunscreen. Carpool from Lapa.", waPlans,
            listOf("hike", "weekend"), listOf(ItemEntity("date", "Saturday 7:00", null, null)), dark = true, h = 900,
        )
        shot(
            "x", "#DB2777", "Type scale that sings", "A modular type scale for product UI",
            "Designer shares a 1.25 type scale with tight tracking for display sizes and tabular numbers.", xDesign,
            listOf("typography", "design systems"), h = 760,
        )
        items += Item(
            id = newId(), kind = ItemKind.Link, title = "kotlinx.serialization guide", summary = "Official guide covering polymorphism, JSON configuration and custom serializers.",
            source = "github.com", categoryId = webDev, categoryPath = pathOf(webDev), tags = listOf("kotlin"),
            link = ItemLink("https://github.com/Kotlin/kotlinx.serialization", "github.com", "GitHub", "Kotlin/kotlinx.serialization", null, null, null),
            capturedAt = ts(), updatedAt = now(),
        )
        shot(
            "instagram", "#B45309", "Omakase night", "Kinoshita omakase counter",
            "Twelve-seat counter with a seasonal menu; reservations open on the first of each month.", igFood,
            listOf("japanese", "special occasion"), listOf(ItemEntity("place", "Kinoshita", "Vila Nova Conceição", "https://maps.google.com/?q=Kinoshita")), h = 1170,
        )
        items += Item(
            id = newId(), kind = ItemKind.Note, title = "Reading list", summary = "Books to read next.",
            categoryId = notes, categoryPath = pathOf(notes), text = "Reading list\nThe Design of Everyday Things\nPiranesi\nAn Elegant Puzzle",
            capturedAt = ts(), updatedAt = now(), favorite = true,
        )
        shot(
            "web", "#2563EB", "Ship small, ship often", "Notes on trunk-based development",
            "Argues for short-lived branches and feature flags over long release trains.", web, listOf("engineering"), h = 1000,
        )
        items.sortByDescending { it.capturedAt }
    }

    private fun now() = Instant.now().toString()
    private fun newId() = UUID.randomUUID().toString().replace("-", "").take(24)
}
