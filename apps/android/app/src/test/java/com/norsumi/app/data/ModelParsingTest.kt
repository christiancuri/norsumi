package com.norsumi.app.data

import com.norsumi.app.data.api.NorsumiJson
import com.norsumi.app.data.api.toJson
import com.norsumi.app.data.model.AuthSession
import com.norsumi.app.data.model.Category
import com.norsumi.app.data.model.Field
import com.norsumi.app.data.model.ItemKind
import com.norsumi.app.data.model.ItemListResponse
import com.norsumi.app.data.model.ItemPatch
import com.norsumi.app.data.model.ItemStatus
import com.norsumi.app.data.model.ServerInfo
import com.norsumi.app.data.model.toTree
import kotlinx.serialization.builtins.ListSerializer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ModelParsingTest {
    private val itemList = """
    {
      "items": [{
        "id": "65f1c0ffee0000000000000a", "kind": "screenshot", "status": "ready",
        "title": "Bráz Elettrica", "summary": "Pizza.", "source": "Instagram",
        "categoryPath": [
          {"id": "r1", "name": "Instagram", "emoji": "📸", "color": "rose"},
          {"id": "c1", "name": "Restaurants", "emoji": "🍝", "color": "orange"}
        ],
        "categoryId": "c1", "tags": ["pizza"],
        "entities": [{"type": "place", "name": "Bráz", "value": "Pinheiros", "url": null}],
        "text": "menu", "note": null,
        "image": {"width": 1080, "height": 2340, "dominantColor": "#aa3300", "mime": "image/png", "bytes": 123,
                  "thumbUrl": "https://api/thumb?sig=1", "url": "https://api/full?sig=1"},
        "link": null, "favorite": true, "archived": false, "error": null,
        "capturedAt": "2026-11-01T10:00:00.000Z", "createdAt": "2026-11-01T10:00:01.000Z", "updatedAt": "2026-11-01T10:00:02.000Z",
        "someFutureField": {"nested": true}
      }, {
        "id": "b", "kind": "link", "status": "processing", "title": "", "summary": "", "source": null,
        "categoryPath": [], "categoryId": null, "tags": [], "entities": [], "text": null, "note": null, "image": null,
        "link": {"url": "https://github.com", "domain": "github.com", "siteName": null, "title": null, "description": null, "faviconUrl": null, "imageUrl": null},
        "favorite": false, "archived": false, "error": null,
        "capturedAt": "2026-11-01T10:00:00Z", "createdAt": "2026-11-01T10:00:00Z", "updatedAt": "2026-11-01T10:00:00Z"
      }, {
        "id": "c", "kind": "video", "status": "brand-new-status", "capturedAt": "2026-11-01T10:00:00Z"
      }],
      "nextCursor": "abc"
    }
    """.trimIndent()

    @Test fun `parses item list matching the contract and ignores unknown keys`() {
        val r = NorsumiJson.decodeFromString(ItemListResponse.serializer(), itemList)
        assertEquals(3, r.items.size)
        assertEquals("abc", r.nextCursor)
        val shot = r.items[0]
        assertEquals(ItemKind.Screenshot, shot.kind)
        assertEquals(ItemStatus.Ready, shot.status)
        assertEquals(listOf("Instagram", "Restaurants"), shot.categoryPath.map { it.name })
        assertEquals(1080, shot.image!!.width)
        assertEquals("place", shot.entities.single().type)
        assertTrue(shot.favorite)
        val link = r.items[1]
        assertEquals(ItemKind.Link, link.kind)
        assertTrue(link.status.isWorking)
        assertEquals("github.com", link.link!!.domain)
    }

    @Test fun `unknown enum values fall back to defaults`() {
        val r = NorsumiJson.decodeFromString(ItemListResponse.serializer(), itemList)
        assertEquals(ItemKind.Screenshot, r.items[2].kind)
        assertEquals(ItemStatus.Ready, r.items[2].status)
    }

    @Test fun `image aspect ratio is clamped`() {
        val r = NorsumiJson.decodeFromString(ItemListResponse.serializer(), itemList)
        assertEquals(0.5f, r.items[0].image!!.aspectRatio, 0.001f)
    }

    @Test fun `parses auth session and server info with google`() {
        val s = NorsumiJson.decodeFromString(
            AuthSession.serializer(),
            """{"user":{"id":"u","email":"a@b.c","name":"A","avatarUrl":null,"providers":["password","google"],"createdAt":"x"},
               "accessToken":"jwt","refreshToken":"r","expiresIn":900}""",
        )
        assertEquals(listOf("password", "google"), s.user.providers)
        val info = NorsumiJson.decodeFromString(
            ServerInfo.serializer(),
            """{"name":"norsumi","version":"0.1.0","registrationOpen":true,"auth":{"password":true,"google":{"webClientId":"id.apps.googleusercontent.com"}}}""",
        )
        assertEquals("id.apps.googleusercontent.com", info.auth.google!!.webClientId)
        val selfHosted = NorsumiJson.decodeFromString(
            ServerInfo.serializer(), """{"name":"norsumi","version":"0.1.0","registrationOpen":false,"auth":{"password":true,"google":null}}""",
        )
        assertNull(selfHosted.auth.google)
        assertFalse(selfHosted.registrationOpen)
    }

    @Test fun `builds category tree`() {
        val cats = NorsumiJson.decodeFromString(
            ListSerializer(Category.serializer()),
            """[{"id":"r","name":"Instagram","parentId":null,"emoji":"📸","color":"rose","itemCount":1},
                {"id":"c","name":"Restaurants","parentId":"r","emoji":"🍝","color":"orange","itemCount":4},
                {"id":"w","name":"Web","parentId":null,"emoji":"🌐","color":"blue","itemCount":2}]""",
        )
        val tree = cats.toTree()
        assertEquals(listOf("Instagram", "Web"), tree.map { it.category.name })
        assertEquals(5, tree[0].totalCount)
        assertEquals("Restaurants", tree[0].children.single().name)
    }

    @Test fun `patch sends explicit nulls only when clearing`() {
        assertEquals("""{"note":null,"categoryId":"c1"}""", ItemPatch(note = Field.Clear, categoryId = Field.Set("c1")).toJson().toString())
        assertEquals("""{"favorite":true}""", ItemPatch(favorite = true).toJson().toString())
        assertEquals("""{"tags":["a","b"]}""", ItemPatch(tags = listOf("a", "b")).toJson().toString())
    }
}
