package com.aspd.education.ui

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.aspd.education.data.AnnouncementItem
import com.aspd.education.data.AspdApiClient
import com.aspd.education.data.BootstrapResponse
import com.aspd.education.data.Chapter
import com.aspd.education.data.ContactRequest
import com.aspd.education.data.Course
import com.aspd.education.data.NoteItem
import com.aspd.education.data.PlatformSettings
import com.aspd.education.data.Profile
import com.aspd.education.data.Subject
import com.aspd.education.data.Topic
import com.aspd.education.data.VideoItem
import kotlinx.coroutines.launch

private enum class AspdTab(val label: String, val icon: ImageVector) {
    HOME("Home", Icons.Filled.Home),
    COURSES("Courses", Icons.Filled.School),
    NOTES("Notes", Icons.Filled.Description),
    VIDEOS("Videos", Icons.Filled.PlayCircle),
    ACCOUNT("Account", Icons.Filled.AccountCircle),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AspdApp(
    apiClient: AspdApiClient,
    resumeTick: Int,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var currentTab by remember { mutableStateOf(AspdTab.HOME) }
    var bootstrap by remember { mutableStateOf(BootstrapResponse()) }
    var profile by remember { mutableStateOf<Profile?>(null) }
    var bookmarkedIds by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var activeNote by remember { mutableStateOf<NoteItem?>(null) }
    var selectedSubjectFilter by remember { mutableStateOf<Int?>(null) }

    fun loadAll(silent: Boolean = false) {
        scope.launch {
            if (!silent) loading = true else refreshing = true
            errorMessage = null
            try {
                val res = apiClient.fetchBootstrap()
                bootstrap = res
                profile = res.profile ?: profile
                bookmarkedIds = res.bookmarkedNoteIds.toSet()
            } catch (e: Exception) {
                if (!silent) errorMessage = e.message ?: "Unable to connect to ASPD backend."
            } finally {
                loading = false
                refreshing = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadAll(silent = false)
    }

    LaunchedEffect(resumeTick) {
        if (resumeTick > 0) {
            loadAll(silent = true)
        }
    }

    val settings = bootstrap.settings

    Scaffold(
        containerColor = AspdCanvas,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AspdSurface,
                    titleContentColor = AspdNavy,
                ),
                title = {
                    Column {
                        Text(
                            text = settings.platformName.ifBlank { "ASPD" },
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            text = profile?.let { "${it.fullName} (${it.role})" } ?: "Study Platform",
                            fontSize = 11.sp,
                            color = AspdSlate,
                            maxLines = 1,
                        )
                    }
                },
                actions = {
                    if (profile?.role == "admin") {
                        IconButton(onClick = { openExternalUrl(context, apiClient.adminPortalUrl()) }) {
                            Icon(
                                imageVector = Icons.Filled.AdminPanelSettings,
                                contentDescription = "Open Admin Panel",
                                tint = AspdBlue,
                            )
                        }
                    }
                    IconButton(onClick = { loadAll(silent = true) }) {
                        if (refreshing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = AspdBlue,
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Filled.Refresh,
                                contentDescription = "Refresh",
                                tint = AspdNavy,
                            )
                        }
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar(containerColor = AspdSurface, tonalElevation = 4.dp) {
                AspdTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = currentTab == tab,
                        onClick = { currentTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label, fontSize = 11.sp, maxLines = 1) },
                    )
                }
            }
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                loading -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        CircularProgressIndicator(color = AspdBlue)
                        Spacer(Modifier.height(12.dp))
                        Text("Syncing latest study materials...", color = AspdSlate, fontSize = 13.sp)
                    }
                }
                errorMessage != null && bootstrap.courses.isEmpty() && bootstrap.notes.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text("Connection issue", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = AspdNavy)
                        Spacer(Modifier.height(8.dp))
                        Text(errorMessage.orEmpty(), color = AspdSlate, fontSize = 13.sp)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { loadAll(silent = false) }) {
                            Text("Retry")
                        }
                    }
                }
                else -> {
                    when (currentTab) {
                        AspdTab.HOME -> HomeScreen(
                            settings = settings,
                            courses = bootstrap.courses,
                            subjects = bootstrap.subjects,
                            notes = bootstrap.notes,
                            videos = bootstrap.videos,
                            announcements = bootstrap.announcements,
                            onSelectSubject = { subId ->
                                selectedSubjectFilter = subId
                                currentTab = AspdTab.NOTES
                            },
                            onOpenNote = { activeNote = it },
                            onDownloadNote = { downloadNotePdf(context, apiClient, it) },
                            onOpenVideos = { currentTab = AspdTab.VIDEOS },
                            onOpenAccount = { currentTab = AspdTab.ACCOUNT },
                        )
                        AspdTab.COURSES -> CoursesScreen(
                            courses = bootstrap.courses,
                            subjects = bootstrap.subjects,
                            chapters = bootstrap.chapters,
                            topics = bootstrap.topics,
                            onOpenSubjectNotes = { subId ->
                                selectedSubjectFilter = subId
                                currentTab = AspdTab.NOTES
                            },
                        )
                        AspdTab.NOTES -> NotesScreen(
                            notes = bootstrap.notes,
                            subjects = bootstrap.subjects,
                            bookmarkedIds = bookmarkedIds,
                            initialSubjectId = selectedSubjectFilter,
                            onSubjectFilterChanged = { selectedSubjectFilter = it },
                            onOpenNote = { activeNote = it },
                            onDownloadNote = { downloadNotePdf(context, apiClient, it) },
                            onToggleBookmark = { noteId ->
                                scope.launch {
                                    try {
                                        val isSaved = apiClient.toggleBookmark(noteId)
                                        bookmarkedIds = if (isSaved) bookmarkedIds + noteId else bookmarkedIds - noteId
                                    } catch (e: Exception) {
                                        Toast.makeText(context, e.message ?: "Sign in to bookmark notes", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                        )
                        AspdTab.VIDEOS -> VideosScreen(
                            videos = bootstrap.videos,
                            subjects = bootstrap.subjects,
                            onWatchVideo = { video ->
                                val target = video.videoUrl.ifBlank { apiClient.webAppBaseUrl() + "/videos" }
                                openExternalUrl(context, target)
                            },
                        )
                        AspdTab.ACCOUNT -> AccountAndContactScreen(
                            apiClient = apiClient,
                            settings = settings,
                            profile = profile,
                            announcements = bootstrap.announcements,
                            onAuthenticated = { newProfile ->
                                profile = newProfile
                                loadAll(silent = true)
                            },
                            onSignedOut = {
                                apiClient.signOut()
                                profile = null
                                bookmarkedIds = emptySet()
                                loadAll(silent = true)
                            },
                        )
                    }
                }
            }
        }
    }

    activeNote?.let { note ->
        NoteReaderDialog(
            note = note,
            platformName = settings.platformName,
            onDismiss = { activeNote = null },
            onDownloadPdf = { downloadNotePdf(context, apiClient, note) },
        )
    }
}

@Composable
private fun HomeScreen(
    settings: PlatformSettings,
    courses: List<Course>,
    subjects: List<Subject>,
    notes: List<NoteItem>,
    videos: List<VideoItem>,
    announcements: List<AnnouncementItem>,
    onSelectSubject: (Int) -> Unit,
    onOpenNote: (NoteItem) -> Unit,
    onDownloadNote: (NoteItem) -> Unit,
    onOpenVideos: () -> Unit,
    onOpenAccount: () -> Unit,
) {
    val subjectMap = remember(subjects) { subjects.associateBy { it.id } }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = AspdNavy),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "${settings.platformName} Academic Hub",
                        color = Color(0xFF93C5FD),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = "Notes, Courses & HD Lectures in One Place",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = settings.tagline,
                        color = Color(0xFFCBD5E1),
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatBadge("${courses.size} Courses")
                        StatBadge("${notes.size} Notes")
                        StatBadge("${videos.size} Lectures")
                    }
                }
            }
        }

        if (subjects.isNotEmpty()) {
            item {
                SectionHeader("Quick Access to Subjects")
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    subjects.forEach { subject ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = AspdSurface),
                            border = BorderStroke(1.dp, AspdBorder),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .width(160.dp)
                                .clickable { onSelectSubject(subject.id) },
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(subject.code, fontSize = 11.sp, color = AspdBlue, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    subject.name,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = AspdNavy,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                    }
                }
            }
        }

        if (notes.isNotEmpty()) {
            item { SectionHeader("Latest Study Notes & PDFs") }
            items(notes.take(5), key = { it.id }) { note ->
                NoteCard(
                    note = note,
                    subjectName = note.subjectId?.let { subjectMap[it]?.name } ?: "General",
                    isBookmarked = false,
                    showBookmark = false,
                    onRead = { onOpenNote(note) },
                    onDownload = { onDownloadNote(note) },
                    onToggleBookmark = {},
                )
            }
        }

        if (announcements.isNotEmpty()) {
            item { SectionHeader("Latest Announcements") }
            items(announcements.take(3), key = { it.id }) { ann ->
                AnnouncementCard(ann)
            }
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = AspdSurface),
                border = BorderStroke(1.dp, AspdBorder),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Need Help or Missing Notes?", fontWeight = FontWeight.Bold, color = AspdNavy)
                    Text(
                        "Contact ${settings.ownerName} directly from the Account & Support tab or watch recorded lectures anytime.",
                        fontSize = 13.sp,
                        color = AspdSlate,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(onClick = onOpenAccount) { Text("Contact Owner") }
                        OutlinedButton(onClick = onOpenVideos) { Text("Video Lectures") }
                    }
                }
            }
        }
    }
}

@Composable
private fun CoursesScreen(
    courses: List<Course>,
    subjects: List<Subject>,
    chapters: List<Chapter>,
    topics: List<Topic>,
    onOpenSubjectNotes: (Int) -> Unit,
) {
    var expandedCourseId by remember { mutableStateOf(courses.firstOrNull()?.id) }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { SectionHeader("Courses & Syllabus (${courses.size})") }
        items(courses, key = { it.id }) { course ->
            val courseSubjects = subjects.filter { it.courseId == course.id }
            val isExpanded = expandedCourseId == course.id

            Card(
                colors = CardDefaults.cardColors(containerColor = AspdSurface),
                border = BorderStroke(1.dp, AspdBorder),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier
                        .clickable { expandedCourseId = if (isExpanded) null else course.id }
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        "${course.category} • ${course.level}",
                        fontSize = 11.sp,
                        color = AspdBlue,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(course.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AspdNavy)
                    Text(course.description, fontSize = 13.sp, color = AspdSlate, maxLines = 3, overflow = TextOverflow.Ellipsis)
                    Text("Instructor: ${course.instructorName}", fontSize = 12.sp, color = AspdSlate)

                    if (isExpanded && courseSubjects.isNotEmpty()) {
                        Spacer(Modifier.height(6.dp))
                        HorizontalDivider(color = AspdBorder)
                        Spacer(Modifier.height(6.dp))
                        courseSubjects.forEach { subject ->
                            val subChapters = chapters.filter { it.subjectId == subject.id }
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 6.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        "${subject.name} (${subject.code})",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 14.sp,
                                        color = AspdNavy,
                                    )
                                    OutlinedButton(
                                        onClick = { onOpenSubjectNotes(subject.id) },
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                    ) {
                                        Text("Notes", fontSize = 12.sp)
                                    }
                                }
                                subChapters.forEach { ch ->
                                    val chTopics = topics.filter { it.chapterId == ch.id }
                                    Text(
                                        "  Ch. ${ch.chapterNumber}: ${ch.title} (${chTopics.size} topics)",
                                        fontSize = 12.sp,
                                        color = AspdSlate,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotesScreen(
    notes: List<NoteItem>,
    subjects: List<Subject>,
    bookmarkedIds: Set<Int>,
    initialSubjectId: Int?,
    onSubjectFilterChanged: (Int?) -> Unit,
    onOpenNote: (NoteItem) -> Unit,
    onDownloadNote: (NoteItem) -> Unit,
    onToggleBookmark: (Int) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var onlyBookmarked by remember { mutableStateOf(false) }
    val subjectMap = remember(subjects) { subjects.associateBy { it.id } }

    val filtered = remember(notes, query, initialSubjectId, onlyBookmarked, bookmarkedIds) {
        notes.filter { note ->
            val matchesQuery = query.isBlank() ||
                note.title.contains(query, ignoreCase = true) ||
                note.description.contains(query, ignoreCase = true) ||
                note.category.contains(query, ignoreCase = true)
            val matchesSubject = initialSubjectId == null || note.subjectId == initialSubjectId
            val matchesBookmark = !onlyBookmarked || bookmarkedIds.contains(note.id)
            matchesQuery && matchesSubject && matchesBookmark
        }
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader("Notes & PDF Library (${filtered.size})")
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Search notes, formula sheets, DPPs...") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = initialSubjectId == null && !onlyBookmarked,
                    onClick = {
                        onSubjectFilterChanged(null)
                        onlyBookmarked = false
                    },
                    label = { Text("All") },
                )
                FilterChip(
                    selected = onlyBookmarked,
                    onClick = { onlyBookmarked = !onlyBookmarked },
                    label = { Text("Saved (${bookmarkedIds.size})") },
                )
                subjects.forEach { s ->
                    FilterChip(
                        selected = initialSubjectId == s.id,
                        onClick = { onSubjectFilterChanged(if (initialSubjectId == s.id) null else s.id) },
                        label = { Text(s.name) },
                    )
                }
            }
        }

        items(filtered, key = { it.id }) { note ->
            NoteCard(
                note = note,
                subjectName = note.subjectId?.let { subjectMap[it]?.name } ?: "General",
                isBookmarked = bookmarkedIds.contains(note.id),
                showBookmark = true,
                onRead = { onOpenNote(note) },
                onDownload = { onDownloadNote(note) },
                onToggleBookmark = { onToggleBookmark(note.id) },
            )
        }
    }
}

@Composable
private fun VideosScreen(
    videos: List<VideoItem>,
    subjects: List<Subject>,
    onWatchVideo: (VideoItem) -> Unit,
) {
    val subjectMap = remember(subjects) { subjects.associateBy { it.id } }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { SectionHeader("Video Lectures (${videos.size})") }
        items(videos, key = { it.id }) { video ->
            Card(
                colors = CardDefaults.cardColors(containerColor = AspdSurface),
                border = BorderStroke(1.dp, AspdBorder),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        "${video.subjectId?.let { subjectMap[it]?.name } ?: "Lecture"} • ${video.instructorName}",
                        fontSize = 11.sp,
                        color = AspdBlue,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(video.title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AspdNavy)
                    if (video.description.isNotBlank()) {
                        Text(video.description, fontSize = 13.sp, color = AspdSlate, maxLines = 3, overflow = TextOverflow.Ellipsis)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "${video.durationSeconds / 60} min • ${video.viewsCount} views",
                            fontSize = 12.sp,
                            color = AspdSlate,
                        )
                        Button(onClick = { onWatchVideo(video) }) {
                            Icon(Icons.Filled.PlayCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Watch")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AccountAndContactScreen(
    apiClient: AspdApiClient,
    settings: PlatformSettings,
    profile: Profile?,
    announcements: List<AnnouncementItem>,
    onAuthenticated: (Profile) -> Unit,
    onSignedOut: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var isRegister by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var loginId by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var authBusy by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }

    var contactName by remember(profile) { mutableStateOf(profile?.fullName ?: "") }
    var contactEmail by remember(profile) { mutableStateOf(profile?.email ?: "") }
    var contactPhone by remember(profile) { mutableStateOf(profile?.phone ?: "") }
    var contactSubject by remember { mutableStateOf("") }
    var contactMessage by remember { mutableStateOf("") }
    var contactBusy by remember { mutableStateOf(false) }
    var contactNotice by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = AspdSurface),
                border = BorderStroke(1.dp, AspdBorder),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (profile != null) {
                        Text(profile.fullName, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = AspdNavy)
                        Text("${profile.email} • Role: ${profile.role}", fontSize = 13.sp, color = AspdSlate)
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            if (profile.role == "admin") {
                                Button(onClick = { openExternalUrl(context, apiClient.adminPortalUrl()) }) {
                                    Text("Open Admin Panel")
                                }
                            }
                            OutlinedButton(onClick = onSignedOut) {
                                Text("Sign Out")
                            }
                        }
                    } else {
                        Text(
                            if (isRegister) "Create ${settings.platformName} Account" else "Sign In (Student or Admin)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = AspdNavy,
                        )
                        authError?.let {
                            Text(it, color = AspdDanger, fontSize = 12.sp)
                        }
                        if (isRegister) {
                            OutlinedTextField(
                                value = fullName,
                                onValueChange = { fullName = it },
                                label = { Text("Full Name") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                        OutlinedTextField(
                            value = loginId,
                            onValueChange = { loginId = it },
                            label = { Text("Login ID or Email") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            label = { Text("Password") },
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                enabled = !authBusy,
                                onClick = {
                                    scope.launch {
                                        authBusy = true
                                        authError = null
                                        try {
                                            val res = if (isRegister) {
                                                apiClient.register(fullName, loginId, password)
                                            } else {
                                                apiClient.login(loginId, password)
                                            }
                                            password = ""
                                            onAuthenticated(res.profile)
                                        } catch (e: Exception) {
                                            authError = e.message ?: "Authentication failed"
                                        } finally {
                                            authBusy = false
                                        }
                                    }
                                },
                            ) {
                                Text(if (authBusy) "Please wait..." else if (isRegister) "Register" else "Sign In")
                            }
                            OutlinedButton(onClick = {
                                isRegister = !isRegister
                                authError = null
                            }) {
                                Text(if (isRegister) "Have an account?" else "Create Account")
                            }
                        }
                    }
                }
            }
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = AspdSurface),
                border = BorderStroke(1.dp, AspdBorder),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Contact ${settings.ownerName}", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = AspdNavy)
                    Text("Support hours: ${settings.supportHours}", fontSize = 12.sp, color = AspdSlate)
                    contactNotice?.let { Text(it, fontSize = 12.sp, color = AspdSuccess) }

                    OutlinedTextField(
                        value = contactName,
                        onValueChange = { contactName = it },
                        label = { Text("Your Name *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = contactEmail,
                        onValueChange = { contactEmail = it },
                        label = { Text("Email *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = contactPhone,
                        onValueChange = { contactPhone = it },
                        label = { Text("Phone (optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = contactSubject,
                        onValueChange = { contactSubject = it },
                        label = { Text("Subject *") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = contactMessage,
                        onValueChange = { contactMessage = it },
                        label = { Text("Message *") },
                        minLines = 3,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            enabled = !contactBusy,
                            onClick = {
                                scope.launch {
                                    contactBusy = true
                                    contactNotice = null
                                    try {
                                        apiClient.submitContact(
                                            ContactRequest(
                                                studentName = contactName.trim(),
                                                email = contactEmail.trim(),
                                                phone = contactPhone.trim(),
                                                subject = contactSubject.trim(),
                                                message = contactMessage.trim(),
                                            )
                                        )
                                        contactSubject = ""
                                        contactMessage = ""
                                        contactNotice = "Message sent to ${settings.ownerName}!"
                                    } catch (e: Exception) {
                                        Toast.makeText(context, e.message ?: "Check all required fields", Toast.LENGTH_SHORT).show()
                                    } finally {
                                        contactBusy = false
                                    }
                                }
                            },
                        ) {
                            Text(if (contactBusy) "Sending..." else "Send Message")
                        }
                        OutlinedButton(onClick = {
                            openExternalUrl(context, "mailto:${settings.ownerEmail}")
                        }) {
                            Icon(Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Email")
                        }
                    }
                    val digits = settings.whatsappNumber.filter { it.isDigit() }
                    if (digits.isNotBlank()) {
                        OutlinedButton(
                            onClick = { openExternalUrl(context, "https://wa.me/$digits") },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("WhatsApp: ${settings.whatsappNumber}")
                        }
                    }
                }
            }
        }

        if (announcements.isNotEmpty()) {
            item { SectionHeader("All Announcements (${announcements.size})") }
            items(announcements, key = { it.id }) { ann ->
                AnnouncementCard(ann)
            }
        }
    }
}

@Composable
private fun NoteCard(
    note: NoteItem,
    subjectName: String,
    isBookmarked: Boolean,
    showBookmark: Boolean,
    onRead: () -> Unit,
    onDownload: () -> Unit,
    onToggleBookmark: () -> Unit,
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = AspdSurface),
        border = BorderStroke(1.dp, AspdBorder),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "$subjectName • ${note.category}",
                    fontSize = 11.sp,
                    color = AspdBlue,
                    fontWeight = FontWeight.SemiBold,
                )
                if (showBookmark) {
                    IconButton(onClick = onToggleBookmark, modifier = Modifier.size(28.dp)) {
                        Icon(
                            imageVector = if (isBookmarked) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                            contentDescription = "Bookmark",
                            tint = if (isBookmarked) AspdBlue else AspdSlate,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }
            Text(note.title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = AspdNavy)
            if (note.description.isNotBlank()) {
                Text(note.description, fontSize = 13.sp, color = AspdSlate, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 4.dp)) {
                OutlinedButton(onClick = onRead, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)) {
                    Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Read", fontSize = 12.sp)
                }
                Button(
                    onClick = onDownload,
                    colors = ButtonDefaults.buttonColors(containerColor = AspdBlue),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                ) {
                    Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("PDF", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun AnnouncementCard(item: AnnouncementItem) {
    Card(
        colors = CardDefaults.cardColors(containerColor = AspdSurface),
        border = BorderStroke(1.dp, AspdBorder),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Filled.Campaign, contentDescription = null, tint = AspdBlue, modifier = Modifier.size(15.dp))
                Text(
                    if (item.isPinned) "Pinned • ${item.category}" else item.category,
                    fontSize = 11.sp,
                    color = AspdSlate,
                )
            }
            Text(item.title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = AspdNavy)
            Text(item.body, fontSize = 13.sp, color = AspdSlate, lineHeight = 18.sp)
        }
    }
}

@Composable
private fun NoteReaderDialog(
    note: NoteItem,
    platformName: String,
    onDismiss: () -> Unit,
    onDownloadPdf: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .background(AspdCanvas),
            color = AspdCanvas,
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(AspdSurface)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(note.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AspdNavy, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("$platformName • ${note.category}", fontSize = 11.sp, color = AspdSlate)
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = AspdNavy)
                    }
                }
                HorizontalDivider(color = AspdBorder)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (note.description.isNotBlank()) {
                        Text(note.description, fontSize = 14.sp, color = AspdSlate, fontWeight = FontWeight.Medium)
                    }
                    Text(
                        text = note.contentBody.ifBlank {
                            "This study material is attached as a PDF file. Tap Download PDF below to save and view it offline on your device."
                        },
                        fontSize = 14.sp,
                        color = AspdNavy,
                        lineHeight = 22.sp,
                    )
                }
                Surface(color = AspdSurface, shadowElevation = 4.dp) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Button(onClick = onDownloadPdf, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Download PDF")
                        }
                        OutlinedButton(onClick = onDismiss) {
                            Text("Close")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
        color = AspdNavy,
    )
}

@Composable
private fun StatBadge(text: String) {
    Surface(
        color = Color(0xFF1E293B),
        shape = RoundedCornerShape(8.dp),
    ) {
        Text(
            text = text,
            color = Color.White,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
        )
    }
}

private fun downloadNotePdf(context: Context, apiClient: AspdApiClient, note: NoteItem) {
    try {
        val url = apiClient.notePdfDownloadUrl(note.id)
        val safeName = note.fileName.ifBlank { "ASPD_Note_${note.id}.pdf" }
            .replace(Regex("[^a-zA-Z0-9._-]"), "_")
            .let { if (it.endsWith(".pdf", ignoreCase = true)) it else "$it.pdf" }

        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle(note.title)
            .setDescription("Downloading study note PDF")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeName)

        apiClient.authToken?.let { request.addRequestHeader("Authorization", "Bearer $it") }

        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        dm.enqueue(request)
        Toast.makeText(context, "Downloading $safeName to Downloads folder", Toast.LENGTH_SHORT).show()
    } catch (_: Exception) {
        openExternalUrl(context, apiClient.notePdfDownloadUrl(note.id))
    }
}

private fun openExternalUrl(context: Context, url: String) {
    try {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    } catch (_: Exception) {
        Toast.makeText(context, "Unable to open link on this device.", Toast.LENGTH_SHORT).show()
    }
}
