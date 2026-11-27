package com.norsumi.app.data

import com.norsumi.app.data.api.itemsUrl
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.ItemKind
import com.norsumi.app.data.model.ItemQuery
import com.norsumi.app.data.model.prunableWhenEmpty
import com.norsumi.app.data.model.toTree
import com.norsumi.app.data.model.totalCount
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CategoryRulesTest {
    private val youtube = Category(id = "yt", name = "YouTube", itemCount = 0, origin = "ai")
    private val recipes = Category(id = "rc", name = "Recipes", parentId = "yt", itemCount = 1, origin = "ai")
    private val web = Category(id = "web", name = "Web", itemCount = 2, origin = "user")
    private val all = listOf(youtube, recipes, web)

    @Test fun `root total includes child topics, consistent with the root cards`() {
        assertEquals(1, all.totalCount("yt"))
        assertEquals(1, all.toTree().first { it.category.id == "yt" }.totalCount)
        assertEquals(1, all.totalCount("rc"))
        assertEquals(2, all.totalCount("web"))
    }

    @Test fun `category pages ask for child topics explicitly`() {
        val url = itemsUrl("https://norsumi.com", ItemQuery(categoryId = "yt"), null)
        assertEquals("yt", url.queryParameter("categoryId"))
        assertEquals("true", url.queryParameter("includeChildren"))
        val library = itemsUrl("https://norsumi.com", ItemQuery(kinds = listOf(ItemKind.Screenshot, ItemKind.Image)), "c1")
        assertNull(library.queryParameter("includeChildren"))
        assertEquals("screenshot,image", library.queryParameter("kind"))
        assertEquals("c1", library.queryParameter("cursor"))
    }

    @Test fun `only empty AI categories without children are prunable`() {
        assertFalse(recipes.prunableWhenEmpty(all))                       // still has an item
        assertTrue(recipes.copy(itemCount = 0).prunableWhenEmpty(all))
        assertFalse(youtube.prunableWhenEmpty(all))                       // has a child
        assertFalse(web.copy(itemCount = 0).prunableWhenEmpty(all))       // user-owned
    }
}
