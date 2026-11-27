package com.norsumi.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Mirrors packages/common/src. Unknown keys are ignored by [com.norsumi.app.data.api.NorsumiJson],
// and unknown enum values fall back to the property default.

@Serializable
enum class ItemKind {
    @SerialName("screenshot") Screenshot,
    @SerialName("image") Image,
    @SerialName("link") Link,
    @SerialName("note") Note,
    ;

    val wire: String get() = name.lowercase()
}

@Serializable
enum class ItemStatus {
    @SerialName("pending") Pending,
    @SerialName("processing") Processing,
    @SerialName("ready") Ready,
    @SerialName("failed") Failed,
    ;

    val isWorking: Boolean get() = this == Pending || this == Processing
}

@Serializable
data class User(
    val id: String,
    val email: String,
    val name: String = "",
    val avatarUrl: String? = null,
    val providers: List<String> = emptyList(),
    val createdAt: String = "",
)

@Serializable
data class AuthSession(
    val user: User,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Long = 900,
)

@Serializable
data class ServerInfo(
    val name: String = "norsumi",
    val version: String = "",
    val registrationOpen: Boolean = true,
    val auth: ServerAuth = ServerAuth(),
)

@Serializable
data class ServerAuth(
    val password: Boolean = true,
    /** Null when the server has no Google OAuth client configured. */
    val google: GoogleAuthConfig? = null,
)

@Serializable
data class GoogleAuthConfig(val webClientId: String)

@Serializable
data class GoogleLoginBody(val idToken: String)

/** `DELETE /api/me`: password accounts confirm with their password; Google-only accounts send no body. */
@Serializable
data class DeleteMeBody(val password: String? = null)

@Serializable
data class ApiErrorBody(
    val statusCode: Int = 0,
    val error: String = "",
    val message: String = "",
)

@Serializable
data class Category(
    val id: String,
    val name: String,
    val slug: String = "",
    val parentId: String? = null,
    val emoji: String = "📁",
    val color: String = "slate",
    val description: String? = null,
    val itemCount: Int = 0,
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class CategoryRef(
    val id: String,
    val name: String,
    val emoji: String = "📁",
    val color: String = "slate",
)

@Serializable
data class ItemEntity(
    val type: String = "other",
    val name: String,
    val value: String? = null,
    val url: String? = null,
)

@Serializable
data class ItemImage(
    val width: Int = 0,
    val height: Int = 0,
    val dominantColor: String = "#888888",
    val mime: String = "",
    val bytes: Long = 0,
    val thumbUrl: String = "",
    val url: String = "",
) {
    /** Width / height, clamped so long scroll captures and panoramas still fit a grid cell (cropped from the top). */
    val aspectRatio: Float
        get() = if (width > 0 && height > 0) (width.toFloat() / height).coerceIn(0.5f, 2.2f) else 0.75f
}

@Serializable
data class ItemLink(
    val url: String,
    val domain: String = "",
    val siteName: String? = null,
    val title: String? = null,
    val description: String? = null,
    val faviconUrl: String? = null,
    val imageUrl: String? = null,
)

@Serializable
data class Item(
    val id: String,
    val kind: ItemKind = ItemKind.Screenshot,
    val status: ItemStatus = ItemStatus.Ready,
    val title: String = "",
    val summary: String = "",
    val source: String? = null,
    val categoryPath: List<CategoryRef> = emptyList(),
    val categoryId: String? = null,
    val tags: List<String> = emptyList(),
    val entities: List<ItemEntity> = emptyList(),
    val text: String? = null,
    val note: String? = null,
    val image: ItemImage? = null,
    val link: ItemLink? = null,
    val favorite: Boolean = false,
    val archived: Boolean = false,
    val error: String? = null,
    val capturedAt: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class ItemListResponse(
    val items: List<Item> = emptyList(),
    val nextCursor: String? = null,
)

@Serializable
data class LibraryStats(
    val total: Int = 0,
    val byKind: Map<String, Int> = emptyMap(),
    val favorites: Int = 0,
    val processing: Int = 0,
    val failed: Int = 0,
    val uncategorized: Int = 0,
    /** Archived items (the only count that includes them). */
    val archived: Int = 0,
)

@Serializable
data class LoginBody(val email: String, val password: String)

@Serializable
data class RegisterBody(val email: String, val password: String, val name: String)

@Serializable
data class RefreshBody(val refreshToken: String)

@Serializable
data class CreateLinkBody(val url: String, val text: String? = null, val capturedAt: String? = null)

@Serializable
data class CreateNoteBody(val text: String, val capturedAt: String? = null)

/** Filters for `GET /api/items`. */
data class ItemQuery(
    /** One or more kinds; sent as `kind=screenshot,image`. Empty = all. */
    val kinds: List<ItemKind> = emptyList(),
    val favorite: Boolean? = null,
    val archived: Boolean? = null,
    val categoryId: String? = null,
    val q: String? = null,
    val limit: Int = 40,
)

/**
 * A partial update. A field is only sent when it is "set"; [Patch.Clear] sends an explicit null
 * (needed for `note` and `categoryId`).
 */
data class ItemPatch(
    val title: String? = null,
    val summary: String? = null,
    val note: Field<String>? = null,
    val categoryId: Field<String>? = null,
    val tags: List<String>? = null,
    val favorite: Boolean? = null,
    val archived: Boolean? = null,
)

data class CategoryPatch(
    val name: String? = null,
    val emoji: String? = null,
    val color: String? = null,
    val description: Field<String>? = null,
)

sealed interface Field<out T> {
    data class Set<T>(val value: T) : Field<T>
    data object Clear : Field<Nothing>
}

/** Tree node built from the flat category list. */
data class CategoryNode(val category: Category, val children: List<Category>) {
    val totalCount: Int get() = category.itemCount + children.sumOf { it.itemCount }
}

fun List<Category>.toTree(): List<CategoryNode> {
    val byParent = groupBy { it.parentId }
    return (byParent[null] ?: emptyList())
        .map { root -> CategoryNode(root, (byParent[root.id] ?: emptyList()).sortedBy { it.name.lowercase() }) }
        .sortedWith(compareByDescending<CategoryNode> { it.totalCount }.thenBy { it.category.name.lowercase() })
}

val CATEGORY_COLORS = listOf(
    "slate", "red", "orange", "amber", "lime", "emerald", "teal", "sky", "blue", "violet", "fuchsia", "rose",
)
