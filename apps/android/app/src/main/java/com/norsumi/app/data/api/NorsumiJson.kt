package com.norsumi.app.data.api

import com.norsumi.app.data.model.CategoryPatch
import com.norsumi.app.data.model.Field
import com.norsumi.app.data.model.ItemPatch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

val NorsumiJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    explicitNulls = false
    encodeDefaults = false
    isLenient = true
}

private fun <T> Field<T>.toJson(map: (T) -> JsonPrimitive) = when (this) {
    is Field.Set -> map(value)
    Field.Clear -> JsonNull
}

fun ItemPatch.toJson(): JsonObject = buildJsonObject {
    title?.let { put("title", JsonPrimitive(it)) }
    summary?.let { put("summary", JsonPrimitive(it)) }
    note?.let { put("note", it.toJson(::JsonPrimitive)) }
    categoryId?.let { put("categoryId", it.toJson(::JsonPrimitive)) }
    tags?.let { tags -> put("tags", JsonArray(tags.map(::JsonPrimitive))) }
    favorite?.let { put("favorite", JsonPrimitive(it)) }
    archived?.let { put("archived", JsonPrimitive(it)) }
}

fun CategoryPatch.toJson(): JsonObject = buildJsonObject {
    name?.let { put("name", JsonPrimitive(it)) }
    emoji?.let { put("emoji", JsonPrimitive(it)) }
    color?.let { put("color", JsonPrimitive(it)) }
    description?.let { put("description", it.toJson(::JsonPrimitive)) }
}
