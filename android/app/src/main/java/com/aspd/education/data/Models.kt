package com.aspd.education.data

import kotlinx.serialization.Serializable

@Serializable
data class PlatformSettings(
    val id: Int = 1,
    val platformName: String = "ASPD",
    val tagline: String = "Structured academic preparation with curated study notes, HD video lectures, and direct faculty mentorship.",
    val ownerName: String = "ASPD Academic Desk",
    val ownerEmail: String = "support@aspd-academy.edu",
    val whatsappNumber: String = "+919876543210",
    val supportHours: String = "Mon–Sat, 9:00 AM – 8:00 PM IST",
)

@Serializable
data class Profile(
    val id: Int = 0,
    val uid: String = "",
    val email: String = "",
    val fullName: String = "Student",
    val phone: String = "",
    val gradeTarget: String = "Class 12 / JEE & NEET",
    val bio: String = "",
    val avatarUrl: String = "",
    val role: String = "student",
    val status: String = "active",
)

@Serializable
data class Course(
    val id: Int,
    val title: String,
    val slug: String = "",
    val category: String = "",
    val level: String = "",
    val description: String = "",
    val instructorName: String = "Faculty",
    val thumbnailUrl: String = "",
    val isPublished: Boolean = true,
)

@Serializable
data class Subject(
    val id: Int,
    val courseId: Int,
    val name: String,
    val code: String = "",
    val description: String = "",
    val accentColor: String = "#1D4ED8",
)

@Serializable
data class Chapter(
    val id: Int,
    val subjectId: Int,
    val title: String,
    val chapterNumber: Int = 1,
    val summary: String = "",
)

@Serializable
data class Topic(
    val id: Int,
    val chapterId: Int,
    val title: String,
    val topicOrder: Int = 1,
    val summary: String = "",
)

@Serializable
data class NoteItem(
    val id: Int,
    val title: String,
    val description: String = "",
    val courseId: Int? = null,
    val subjectId: Int? = null,
    val chapterId: Int? = null,
    val topicId: Int? = null,
    val category: String = "Lecture Notes",
    val fileType: String = "pdf",
    val fileUrl: String = "",
    val fileName: String = "Study_Note.pdf",
    val fileSizeBytes: Int = 0,
    val contentBody: String = "",
    val downloadsCount: Int = 0,
    val viewsCount: Int = 0,
    val createdAt: String = "",
)

@Serializable
data class VideoItem(
    val id: Int,
    val title: String,
    val description: String = "",
    val courseId: Int? = null,
    val subjectId: Int? = null,
    val chapterId: Int? = null,
    val videoUrl: String = "",
    val thumbnailUrl: String = "",
    val durationSeconds: Int = 0,
    val instructorName: String = "Faculty",
    val viewsCount: Int = 0,
    val createdAt: String = "",
)

@Serializable
data class AnnouncementItem(
    val id: Int,
    val title: String,
    val body: String = "",
    val category: String = "general",
    val isPinned: Boolean = false,
    val createdAt: String = "",
)

@Serializable
data class BootstrapResponse(
    val settings: PlatformSettings = PlatformSettings(),
    val profile: Profile? = null,
    val courses: List<Course> = emptyList(),
    val subjects: List<Subject> = emptyList(),
    val chapters: List<Chapter> = emptyList(),
    val topics: List<Topic> = emptyList(),
    val notes: List<NoteItem> = emptyList(),
    val videos: List<VideoItem> = emptyList(),
    val announcements: List<AnnouncementItem> = emptyList(),
    val bookmarkedNoteIds: List<Int> = emptyList(),
)

@Serializable
data class AuthResponse(
    val token: String = "",
    val profile: Profile,
)

@Serializable
data class LoginRequest(
    val loginId: String,
    val password: String,
)

@Serializable
data class RegisterRequest(
    val fullName: String,
    val loginId: String,
    val password: String,
)

@Serializable
data class ContactRequest(
    val studentName: String,
    val email: String,
    val phone: String = "",
    val subject: String,
    val message: String,
)

@Serializable
data class BookmarkResponse(
    val bookmarked: Boolean = false,
)

@Serializable
data class ErrorPayload(
    val error: String = "Request failed",
)
