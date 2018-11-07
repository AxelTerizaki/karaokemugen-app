# Versions

## v2.4.0 "Juri Judicieuse" - 06/11/2018

### New features

- Configuration can be edited by hand from control panel. Not all configuration items are editable. (#338)
- Karaoke Mugen is now fully compatible (and even requires) Node 10 (#307)
- The welcome screen now displays what's new on the karaoke base and site's RSS feeds (#343)
- Our new logo, designed by @Sedeto, has been added to the welcome screen!

### Improvements

- Songs can now be freed from the current playlist
- Progress when generating database or updating base files from the control panel is now displayed on the control panel itself (#348)
- Generation's progress is now displayed in the console.
- Public interface is reloaded when the webapp mode (open, restricted or closed) changes. (#357)
- TAG_VOICELESS has been removed in favor of the language code ZXX which is "No linguistic content" (#366)
- Special language names (FR, JAP, ANG...) in files is now obsolete in favor of ISO639-2B codes. This is for better consistency. (#365)
- The `series.json` file is not used anymore. Instead, series data is read from the new `series/` folder with its `.series.json` files (#364)
- Series' international names are now searchable in control panel (#362)
- When two KIDs are in conflict in your karaoke base, Karaoke Mugen will now tell you which ones are causing the conflict (#361)
- In the karaoke submission form, tags have been replaced by checkboxes for misc tags. (#359)
- Icons and names have been changed for consistency on the welcome screen (#356)
- Your data files are now checked on startup to decide if a generation is needed or not. (#354)
- Series are displayed in a more concise way in case of AMVs. (#350)
- Karaoke and series lists in control panel are now properly paginated. Page position and searches are remembered when coming back to the list after editing/creating a karaoke (#342)
- When creating/editing a language, a text box allows to search for a language code.

### Fixes

- Download problems when updating your base files should be fixed now. Really. (#332)
- Download groups weren't saved properly in .kara files when saving one from the kara submission form (#367)
- Fixed hardsub video submission with the control panel's form
- Fixed adding series without aliases
- Fixed Smart Shuffle
- Fixed deleting favorites
- Fixed editing series not updating i18n data
- Fixed search field in control panel not registering the last character typed

## v2.3.2 "Ichika Imperturbable" - 03/09/2018

This is a bugfix release.

### Fixes

- Fix searching through series original names
- Fix kara/media/sub files not being renamed properly when edited

## v2.3.1 "Ichika Insouciante" - 22/08/2018

This is a bugfix release.

**IMPORTANT : Karaoke files version 2 or lower are now deprecated. Please update your karaoke base.**

### Improvements

- Searches now take the original series' name into account too.
- Karas in error are not added to the database anymore
- Audio files are now accepted in the karaoke add form.
- Various speedups in karaoke and playlist content list display thanks to @Jaerdoster's mad SQL skills
- Added a XBOXONE tag for songs.
- mpv does not try to autoload external files anymore, resulting in better performance if your media files are on a network storage.

### Fixes

- The karaoke base update button now works.
- Editing a hardsubbed karaoke now works.
- Filenames are better sanitized when editing/adding new karaokes
- Searching in playlists now work again.
- Fixed some possible SQL injections.
- When a media is missing, getting karaoke details does not fail anymore
- Fixed some english translations
- Fixed jingles not playing at all
- Fixed log spam on OSX about config file being changed
- Fixed config file being accidentally overwritten with a new one
- Songs are now correctly removed automatically from the public playlist once played.

## v2.3.0 "Ichika Idolâtrice" - 14/08/2018

For a complete run-down on the new features, check out v2.3.0-rc1's changelog below.

We will only cover changes from rc1 to finale here :

### Enhancements

- "Update from Shelter" button now returns a message immediately inviting you to check the console for progress
- "Connection lost" message now displays a cool noise effect
- Database is now more optimized and should make actions involving playlists faster

### Fixes

- #328 Progress bar during updates should scale properly to the window and not display "Infinity" anymore
- Filter panel on karaoke list now displays properly on Safari iOS
- Config file should not be overwritten anymore (hopefully)
- Fixed updating series and displaying karaoke lists and tags in control panel
- Fixed the "Stop after current song" button

## v2.3.0-rc1 "Ichika Immergée" - 08/08/2018

### New exciting features(tm)

- #118 Karaoke Mugen can generate .kara files for you if you fill out a form in the control panel, making it much easier to create karaoke files for the Karaoke Mugen base.
- #325 There is now a link to help users suggest a series they think should be in the Karaoke Mugen database
- #340 In addition of the usual view and favorites view, users can get a new "Most recent songs" view with the last 200 songs added in the database (ordered by creation date)
- #120 Users can now navigate through the song list by tags (language, singer, etc.) year, and series.
- #305 A smarter shuffle is available for those with big playlists.
  - It should spread long and short songs to avoid too many long songs following each other
  - Songs added by one user won't be following each other and will be spread through the playlist
- #334 The series database can be managed from the control panel. This updates the `series.json` file
- #324 Karaoke operators can now free songs manually
- #153 A "more information" link has been added to songs' info panel. It allows you to get more information on a particular series or singer.
- #152 You can add a song multiple times in the current playlist now (optional)

### Enhancements

- #336 The web interface will fade to black and display a message when Karaoke Mugen isn't running anymore
- #330 Buttons have been normalized throughout the web interface
- #322 Many optimizations have been made through the code, making it also simpler to read.
- #321 The temp folder is cleaned at startup.
- #320 Users' login time is not updated in real time anymore to avoid stressing out the database
- The `userdata.sqlite3` file is backuped before a new generation is made.
- #139 PIP Slider in web interface now has percentage values displayed

### Fixes

- #326 Songs cannot be added anymore if they are present in the blacklist
- #317 Catching SQLITE_BUSY error messages from background jobs during database maintenance mode
- Engine asks if player is ready before issuing any commands.

## v2.2.3 "Haruhi Hyperactive" - 16/07/2018

### Fixes

- #332 Fixes an issue some (many) people had with the in-app karaoke base updater, where downloads would get stalled and the app hanged. Writing a complete download system with retries and error handling is difficult, and the issue isn't showing for a lot of people.
- Fixes a big issue with database (re)generation regarding series, which would causes mismatches between a series in the karaoke list and what's going to be played.
- Karaoke Mugen shouldn't hang anymore when trying to generate a database without any kara files present
- Quotes in series names are properly inserted in database now
- FTP downloads for updater now has a retry system
- Medias are now downloaded before subs

## v2.2.2 "Haruhi Hibernante" - 03/07/2018

### Fixes

- #311 AutoPlay mode is now working again, for real.
- #333 Preview generation has been fixed, and won't be canceled on the first video it cannot generate preview for.
- #331 Admin tutorial now checks for `appFirstRun` in addition of `admpwd`
- Media files are now moved from the import folder to the medias folder when doing a mass import.

### Enhancements

- New tag for songs : TAG_3DS
- #335 When using the second video monitor (second mpv), it wasn't synchronized with the first one when you used arrow keys to navigate in the first mpv video. Note that this could potentially lead to video lags on the second mpv window, but since it's just a monitor, we didn't think it would be much of an issue. Please give us feedback about this.
- Default video directory is now `medias`
- Samples have been updated with a `medias` folder.
- Samples now include a `series.json` sample file
- macOS releases are now in `.tar.gz` instead of `zip` to keep permissions intact.

## v2.2.1 "Haruhi Hypnotisante" - 19/06/2018

This version is also known as "Just Haruhi"

### IMPORTANT

In preparation for **July 1st 2018** when the videos folder will be renamed to "medias", your videos folder will be renamed automatically after this date if :

- Your config has the default `app/data/videos`
- That folder exists
- The `medias` folder does not exist.

If any of these conditions are not met, proceed as usual, your configuration and folder structure won't be modified.

### Enhancements

- `userdata.sqlite3` is backupped before running integrity checks so you can recover from a bad karaoke database generation that would have wiped out your playlists, favorites, and other data.
- Added TAG_WII
- Added TAG_SATURN
- Config file change message is now debug only.

### Fixes

- The .kara generation tool has been fixed. Also, if a .kara's subfile has `dummy.ass` it won't trigger a subtitle extraction on its .mkv file anymore. Some .mkvs have hardsubs, yes.
- Blacklisting series now work correctly.
- When triggering the player's play method, make sure it is ready before.
- #316 Base updater should handle connection timeouts better.
- Fixed database generation when using `--generate` without any database existing.

## v2.2.0 "Haruhi Hagiographique" - 04/06/2018

For a complete changelog of v2.2 changes, check out v2.2-rc1's changelog below.

Changes from v2.2-rc1 to v2.2 :

### Bonus features

- #314 Karaoke Mugen can optionally publish its public and local IP to `kara.moe` to allow people to type a shorter URL in order to access the instance from the local network. `kara.moe` will redirect to your local instance.
- #312 A monitor window can be spawned for the player, allowing you, karaoke session operator, to see what the others see on the big screen where your main window is.
- Added new guest names and quotes
- Karaoke Mugen will check during startup if all guests exist. If not, new guests will be added to the user list. So you won't miss on new updates!
- Added the "Duo" tag for karaokes meant to be sung by two people.
- Added a demo mode for online demonstrations (passwords can't be changed and mpv is not controllable)
- .ass files are now read directly by mpv and not by Karaoke Mugen then passed to mpv anymore.

### Fixes

- #313 Control panel's user list now displays dates correctly
- Better error handling for mpv thanks to node-mpv new features
- Database generation from the control panel now works again
- Removed useless code in initial database creation. The `appFirstRun` setting will be overriden to 1 if `userdata.sqlite3` is missing.
- Searches containing quotes (') now return results
- Blank series data is created if it exists in a .kara file but not in the `series.json` file. This allows you to search for that series even if it's not in the JSON file. NOTE : this throws an error in strict mode.

## v2.2-rc1 "Haruhi Hargneuse" - 24/05/2018

This version requires your attention on the following points :

- `PathMedias` setting for storing media files replaces `PathVideos`
- Videos will be stored in a `medias` folder, not `videos` anymore starting July 1st 2018
- .kara format is going to be version 3 from now on, which means older versions of Karaoke Mugen won't be able to import the [Karaoke Base](http://lab.shelter.moe/karaokemugen/karaokebase) beyond July 1st 2018

### New Shiny Features

- #302 As a regular user, you can now remove your own submissions from the current/public playlist, in case you added a song by mistake for instance.
- #288 Alternative series names have been overhauled. We now have a database of series' names depending on language. Admins can select which way series should be displayed:
  - As they are originally (use japanese titles for japanese shows, etc.)
  - According to the song's language (use japanese titles for japanese songs, english titles for english songs, etc.)
  - According to Karaoke Mugen's language (uses system locale to determine which language to use. Defaults back to english and then original name)
  - According to the user's language (uses your browser's language to determine which language to use. Defaults back to english adn then original name)
- #282 Support for audio-only karaokes
  - You can create karaokes with mp3+ass files, for songs which do not have any video available anywhere on the Internets.
  - Supported formats are mp3, m4a and ogg.
  - Your file should have a cover art metadata. If it does it'll be used as background. If not KM's default background will be used.
  - Enjoy your long versions of songs :)
  - As a result KM's .kara format evolves to version 3. Version 2 can still be imported safely in KM 2.1 and below. Version 3 can only be imported in 2.2 and higher.
  - `videos` folder now becomes the `medias` folder. To help with this.
- #279 Song history can now be viewed in the control panel (administration).
  - This is a list of most viewed songs.
- #273 You can import/export your favorites.
  - Useful when you go from one karaoke session to the other, carry your favorites on your phone anywhere and import them in the KM instance you're using!
- #233 Song rankings can now be viewed in the control panel. This is a list of most requested songs (not necessarily viewed)
- #109 Adding songs can now be limited to either number of songs or time.
  - For example you can give users 5 minutes of karaoke each.
  - Adding songs longer than their time left is not allowed.
  - Just like with songs, time is given back once the song is freed or is being played on screen.
- #79 Public vote mode can be enabled and offers a poll to users on their devices with 4 songs to choose from.
  - Songs are taken from the public/suggestions playlist.
  - Poll lasts 30 seconds and the winner song is added to the current playlist.
  - If two or more songs are the highest in votes, a random one is chosen among them.
  - Another poll is created.
  - This is perfect if you want to have your users participate in the current playlist creation or if you want to just lean back and enjoy karaoke with friends without worrying about the playlist (create an AutoMix and make it a public playlist, then enable this mode)

### Enhancements

- #304 Search fields now includes who added the song in a playlist
- #297 Small tweaks made to the welcome page
- #291 Jingle information is now displayed in the UI's song bar when a jingle is playing
- #290 ASS files are no longer stored in the database.
  - This should make database generation much faster
  - Modifying an ASS file (to test stuff while making karaokes) will have an immediate effect now.
- #288 Search/filtering is now done in SQL, which greatly improves speeds
- #285 Config file is now validated and ignored if there are mistakes anywhere

### Fixes

- #299 Better handling of how Karaoke Mugen is shut down regarding database access (should remove any SQLITE_BUSY errors)
- #295 Forbidden messages won't be displayed anymore on first login
- #311 Autoplay/Repeat playlist now behave correctly

## v2.1.2 "Gabriel Gênante" - 16/05/2018

### Information

- Minimum required NodeJS version is now 8.4.0. This does not affect you if you use the packaged, binary versions of Karaoke Mugen

### Fixes

- #40 Lowered number of files processed simultaneously during generation. Linux users won't need to modify their max number of file descriptors with `ulimit`
- Fixed favorites list not being displayed properly
- A proper error message is displayed when trying to add a song already present in the playlist
- #298 Jingles list is now properly created. You won't run out of jingles anymore!
- #293 Song list sort order has been modified a little (music videos are now properly sorted)

### Enhancements

- #294 Karaoke Mugen now exits after karaoke base update is done.
- #296 "Press key on exit" is only displayed if there's an error.

### Features removed

- #7 We pulled a Sony on you and removed the software updater. It wasn't working to begin with and needed separate development efforts. If someone's up for it...

## v2.1.1 "Gabriel Grivoise" - 03/05/2018

### Fixes

- The Magical Girl tag is now properly displayed
- A bug in the function checking if a user is allowed to add a karaoke has been fixed
- Importing playlists has been fixed
- #289 Throttled the commands sent to the player to avoid flooding it when user purposefully clicks like an idiot everywhere at high speeds.

## v2.1.0 "Gabriel Glamoureuse" - 18/04/2018

Refer to the previous release candidates for a full changelog.

Changes sinces 2.1-rc1 :

### Enhancements

- Added a new tag for songs difficult to sing : TAG_HARDMODE
- #287 When using the "stop after current song" button, hitting the Play button will play the next song, not the one you stopped at.
- #253 Rearranged options panel
- #284 Removed admin password change since it's not used anymore
- #281 Songs are now properly ordered by types in lists (Opening first, then insert songs, then endings)
- Added more log messages
- Added some tasks before exiting the app (close database and mpv properly)

### Fixes

- #270 Fixed duplicate kara information panel when opening and closing it quickly.
- #277 Fixed (hopefully) app slowdown under high load
- Fixed some admin tutorial messages
- #274 Songwriter is now a searchable item in karaoke lists
- Fixed song quotas per user not being updated properly
- Fixed song copy from one playlist to another
- Tweaked french translation a little
- #276 Fixed private/public mode switches
- Link to documentation is now correct in welcome screen

### Delayed

- #7 Auto-updater for the app has been moved to v2.2 as we still have some work to do and it's a little tricky.


## v2.1-rc1 "Gabriel Glandeuse" - 05/04/2018

Due to the many changes in this version, you're advised to read the `config.ini.sample` file or the docs to find out about new settings.

You're also advised to read [the documentation](http://mugen.karaokes.moe/docs/
).
[API documentation](http://mugen.karaokes.moe/apidoc/) has also been updated.

Contributors for this version : @Aeden, @AxelTerizaki, @bcourtine, @Kmeuh, @mirukyu, @spokeek, @Ziassan

### Known bugs

- Software updates (#7) are not working properly yet. This will be fixed in the final release. In the meantime it has been disabled.

### New features

- #223 An interactive tutorial has been added for admins and users. A welcome screen has also been added, and the app will open a browser on startup.
- #101 Video previews can be generated (if you switch the setting on) for users to check what the karaoke video looks like on their device.
- #115 Added a user system to better manage permissions and create new features
- #127 Remade the control panel in ReactJS and added new features inside
- #150 Viewcounts can be reset in the control panel.
- #247 Users can be managed from the control panel.
- #151 Songs in lists now change colors if they're soon to be played, or have been played recently
- #167 In public mode, song suggestions can be "liked" by users so the admin can get a better idea of what the public wants. Songs which receive enough "likes" don't count anymore in a user's quota.
- #199 Added a favorites system. Users can add/remove favorite karaokes and add karas from that list.
- #202 Public interface can now be closed down or limited by an admin to disallow adding new karaokes, for example.
- #214 Current playlist now scrolls and follows the currently playing karaoke
- #228 In private mode, makes sure people who didn't request many songs get priority
- #234 `--validate` command-line argument to only validate .kara files (avoid generating database)
- Many command-line arguments have been added. Run `yarn start --help` to get a list.
- #238 A bunch of new tags have been added to the file format
- #240 `config.ini` is now reloaded if modified outside of the app while it's running
- #248 Updating the karaoke base from Shelter can now be done within the app's control panel, or via commandline with the `--updateBase` argument.
- #252 Wallpaper will now be changed once per version
- #266 Added a button in control panel to backup your config.ini file (creates a config.ini.backup file)

### Enhancements

- #201 Generating karaoke database is now faster and simpler
- #218 Jingles are all played before being shuffled again to avoid repeats
- #219 .kara files are now verified before being imported into a database
- #226 The app has been entirely rewritten in ES2015+, meaning it's simpler to read and code for
- #231 Config files have been reorganized. `config.ini.default` isn't needed anymore by the app to start up.
- #239 "Play after" feature has been fixed.
- #246 mpv is now restarted at once if the karaoke isn't running.
- #261 Log files are now in their own directories
- #267 Quotes are now ignored when doing searches

### Fixes

- #217 Obsolete blacklist criterias can now be deleted.
- #227 Long titles now fit in playlists
- #236 Viewcounts are now kept even after a database regeneration
- #251 Karaoke Mugen's URL font on connection info display during play/stop mode has been enlarged as it was difficult to read from afar.
- #260 .kara files' `datemodif` information is now written correctly.
- #244 Lyrics panel in kara information can now be closed.

## v2.0.7 - 17/02/2018

Below here, patch notes were written in french.

Hé ben non c'était pas la dernière version la 2.0.6 vous y avez cru hein ?

### Correctifs

- Fix bug introduit dans la 2.0.6 empêchant d'initialiser la base au lancement.

## v2.0.6 - 15/02/2018

Dernière version (fort probablement) avant le passage à la 2.1.

### Correctifs

- En cas de changement de base de données de karaokés, l'application ne plante plus comme une otarie bourrée à la bière au lancement. (Relancer une seconde fois fonctionnait)
- Les tests d'intégrité en cas de changement de base de données / régénération sont désormais tous executés. Cela pouvait causer des playlists mélangées.
- Les options sont désormais correctement enregistrées même lorsqu'elles sont vides.

## v2.0.5 - 01/12/2017

### Améliorations

- Ajout d'une option `--generate` à la ligne de commande pour forcer une génération de la base et quitter.

### Correctifs

- Faire glisser à gauche sur l'interface mobile ne rajoute plus le kara ! Seulement à droite.
- Fix des samples
- Fix en cas de kara absent d'une génération sur l'autre de la base.

## v2.0.4 - 20/11/2017

- Fix des jingles qui ne se jouent plus si on change l'intervalle entre deux jingles et que cet intervalle devient plus petit que le compteur actuel
- Déploiement continu des nouvelles versions via gitlab

## v2.0.3 - 12/11/2017

- Fix de la réécriture de karas durant la génération
- Fix de l'erreur `OnLog is not a function` du calcul de gain des jingles

## v2.0.2 - 12/11/2017

- #221 Fix en cas d'absence de jingle (cela arrêtait la lecture)

## v2.0.1 - 11/11/2017

- Traduction de certains commentaires de code
- #201 Nouveau système de génération de base de données, plus souple, moins de code.
- Readme anglais/français

## v2.0 "Finé Fantastique" - 06/11/2017

### Améliorations

- Possibilité d'annuler un kara en cours d'ajout depuis la version mobile
- Favicon !
- Le titre de la fenêtre affiche désormais "Karaoke Mugen"
- Le temps total et restant d'une playlist est désormais indiqué en HH:MM plutôt qu'en HH:MM:SS

### Corrections

- Messages d'erreur plus clairs
- Vider une playlist met à jour le temps restant de celle-ci
- #187 Les paramètres plein écran et toujours au dessus sont maintenant plus clairs.
- Le volume ne change plus subitement après un redémarrage
- Le temps restant d'un kara est mieux calculé

### Développement

- Ajout d'une doc complète de l'API : http://mugen.karaokes.moe/apidoc

## v2.0 Release Candidate 1 "Finé Fiévreuse" - 25/10/2017

### Améliorations

- #181 Karaoké Mugen peut désormais passer des jingles vidéo entre X karaokés !
  - Déposez de courtes vidéos dans le dossier `app/jingles` (ou tout autre dossier de votre choix via le paramètre `PathJingles` de votre fichier `config.ini`)
  - Réglez le paramètre "Intervalle entre les jingles" dans l'interface ou modifiez `EngineJinglesInterval` pour définir le nombre de chansons qui doivent passer avant qu'un jingle ne passe (20 chansons par défaut, soit environ 30 minutes de karaoké)
  - Les jingles ne sont pas affichés dans la playlist !
  - Leur gain audio est calculé au démarrage de l'app (#185)
- #180 Le QR Code est maintenant affiché en surimpression par le lecteur vidéo
  - Démarrage du coup plus rapide car pas de fichier image à modifier.
  - Déposez des fonds d'écran dans le dossier `app/backgrounds` et Karaoke Mugen en prendra aléatoirement un pour l'afficher entre deux chansons.
- #182 Dans l'affichage des playlists, le temps restant de celle-ci s'affiche désormais en bas à droite.
- #172 Les fichiers de log sont maintenant nommés avec la date du jour.
- #175 Les chemins spécifiés dans le fichier `config.ini` peuvent maintenant être multiples.
  - Karaoke Mugen ira chercher dans chaque dossier (karas, paroles, vidéos, fonds d'écran
, jingles...) tous les fichiers s'y trouvant. Par exemple si vous avez trois dossiers de vidéos listés, Karaoke Mugen vérifiera la présence de vidéo dans chaque dossier avant d'abandonner.
  - Pour indiquer plusieurs dossiers, il faut séparer leurs chemins par des pipes `|`. `Alt Droit + 6` sur un clavier AZERTY. Exemple : `app/data/videos|D:/mesvideostest`
  - Les chemins seront traités dans l'ordre. Si une même vidéo (par exemple) existe dans deux dossiers, c'est celle du premier dossier listé qui sera prise en priorité
- #174 Ajout d'un paramètre `EngineAutoPlay` (Lecture Automatique) qui lance la lecture automatiquement dés qu'un karaoké est ajouté, si celui est sur stop.
  - Pour toujours plus de KARAOKE INFINI.
- #174 Ajout d'un paramètre `EngineRepeatPlaylist` (Répéter la playlist courante)
  - Cela permet de relancer celle-ci automatiquement lorsqu'on arrive au dernier morceau.
- #137 Nouvelle fonction Lire Ensuite.
  - Un clic droit sur le bouton d'ajout d'un kara permet de l'insérer pile après la chanson en cours !
- #179 Boutons de navigation "retour en haut/en bas/kara en cours" ajoutés
- #196 Personnalisation des infos affichées en bas de l'écran durant les pauses/jingles
  - `EngineDisplayConnectionInfo` : Affiche ou non les infos de connexion (défaut : 1)
  - `EngineDisplayConnectionInfoQRCode` : Affiche ou non le QR Code (défaut : 1)
  - `EngineDisplayConnectionInfoHost` : Force une adresse IP/nom d'hôte pour l'URL de connexion (défaut : vide)
  - `EngineDisplayConnectionInfoMessage` : Ajoute un message avant celui avec l'URL. Par exemple pour indiquer un réseau Wifi auquel se connecter au préalable.
  - Les informations de connexion sont réaffichées à 50% de la chanson en cours pendant 8 secondes
- #195 Les informations de la chanson sont maintenant affichées aussi à la fin de la chanson en cours
- Il est désormais possible d'indiquer à Karaoke Mugen un chemin web (HTTP) pour récupérer les vidéos s'il ne les trouve pas dans vos dossiers.
  - Si vous êtes sur un réseau local ou que vos vidéos sont hébergées sur Internet, vous pouvez spécifier `PathVideosHTTP=http://monsiteweb.com/videos` pour que Karaoke Mugen streame les vidéos. Cela ne les télécharge pas définitivement sur votre disque dur !
- #189 Des openings ou endings spécifiques peuvent être recherchés désormais.
- La recherche prend en compte l'auteur du karaoké
- #184 Le temps de passage d'un karaoké dans la liste de lecture courante est indiqué (genre "dans 25 minutes")
- Les karas dans la liste publique/de suggestions sont supprimés dés qu'ils sont joués en courante.
- #135 L'interface est traduite en anglais et français et se base sur la langue de votre navigateur. On a posé les bases pour une traduction en d'autres langues
- #197 Bouton aller au début/en fin de playlist et aller au kara en cours de lecture
- #204 Nouveau critère de blacklist (nom de la série)
- #92 Une limite de chansons par utilisateur a été mise en place.
  - Une fois définie, la limite empêche les gens d'ajouter un karaoké s'ils ont déjà ajouté trop de chansons. Une fois les chansons de l'utilisateur passées, il peut en ajouter de nouvelles.

### Corrections

- #75 Utilisation d'un nouveau module d'accès à la base de données SQLite permettant de gérer les migrations et les promesses.
- #191 Les pseudos contenant { } sont maintenant correctement affichés à l'écran
- Optimisations de la génération de la base de données
  - La génération de la base de données ne réécrit plus inutilement les .kara (uniquement s'il y a des modifications apportées, vidéo changée, etc.)
  - Ajout de profiling sur les différentes étapes pour voir lesquelles prennent du temps
  - Les tests d'intégrité de la base utilisateur utilisent maintenant une transaction et sont bien plus rapides si vous avez beaucoup de playlists ou de karas blacklistés.
  - Les fichiers de paroles vides (vidéos hardsubbées, etc.) ne sont plus écrits dans la base.
  - Tests en cas de bases de données mal formées pour déclencher une regénération si besoin
- #169 Fix du fichier log inexistant
- #178 Les champs de saisie des critères de blacklist sont désormais pleinement utilisables, en toutes circonstances (même durant les horaires de nuit)
- #177 Le scrolling sur iPad/iPhone/iTouch est maintenant plus fluide
- #114 Les critères de blacklist sont maintenant correctement mis à jour lors d'une régénération e la base.
- Plus de type "inutilisé" parmi les critères de blacklist !
- Quelques fix d'interfaces au niveau des critères de blacklist (notamment #192)
- #193 Les changements de mot de passe devraient mieux se passer désormais.
- #186 Les tests d'intégrité de la base utilisateur sont réalisés à chaque lancement si la base karas et utilisateur n'ont pas été générées en même temps.
- #183 La recherche des noms de série alternatives marche de nouveau correctement
- Un message est affiché quand les paroles ne sont pas affichables dans l'interface
- #205 #206 "Tags" devient "Métadonnées" dans l'interface
- #194 Soucis de scrolling en cas de karas avec plusieurs lignes corrigé
- #207 Les langues sont traduites dans la liste des critères d'une blacklist
- #208 Le critère "tag par nom" n'est plus sensible à la casse
- #210 La blacklist se rafraichit désormais correctement
- #213 Les paramètres "AlwaysOnTop" et "Fullscreen" sont désormais bien affichés sur l'interface par rapport à la réalité du terrain.
- #212 Le QRCode est maintenant en haut de l'écran pour éviter que des lignes trop longues en bas ne s'affichent dessus
- #211 La suppression multiple d'éléments de la whitelist fonctionne de nouveau
- #209 On peut de nouveau ajouter plusieurs karaokés d'un coup à la blacklist
- #190 La suppresion de plusieurs karaokés devrait être plus rapide

### Développement

- Passage à Babel/ES2015+ tout doucement. (Nécessite Node8)
- **Modification d'API** : Les messages de réponse de l'API ont été complètement revus, consultez la documentation pour plus d'informations.
- #135 Les retours de l'API ont été normalisés. Une doc plus précise et complète va bientôt être disponible

### Mettre à jour

#### Versions binaires

- Soon(tm)

#### Version source

- Récupérer le dernier code source

```sh
git fetch
git checkout v2.0-rc1
```

- Mettre à jour les packages

```sh
yarn install
```

Si `yarn` n'est pas installé :

```sh
npm install -g yarn
```

`npm`, c'est un peu comme Internet Explorer, son seul intêret c'est d'installer `yarn`

## v2.0 Beta 2 "Finé Foutraque" - 29/09/2017

### Améliorations

- #130 Le bouton "J'ai de la chance !" piochera désormais dans le résultat de votre recherche. Par exemple si vous tapez "Naruto" il prendra au hasard un OP/ED de Naruto.
- #134 Ajouter une selection deselectionne les karas selectionnés (une modification selectionnée par nos soins)
- #138 Lors d'un changement de paramètre nécessitant un redémarrage du lecteur, celui-ci redémarrera à la fin de la chanson en cours (par exemple changer d'écran ne peut pas être fait à la volée)
- #144 L'export de liste de lecture (et l'import) prend désormais en compte où vous en étiez dans la liste de lecture
- #146 L'administrateur peut maintenant afficher des messages à l'écran du karaoké ou sur les interfaces des utilisateurs (ou les deux). L'affichage à l'écran supporte les tags ASS.
- #164 L'application refusera de démarrer si vous n'avez pas mpv 0.25 d'installé sur votre système. Cela ne concerne que les cas où vous fournissez votre propre mpv à Karaoke Mugen.
- #143 Les paramètres pour spécifier les binaires de mpv selon votre OS (`BinPlayerOSX`, `BinPlayerWindows` et `BinPlayerLinux`) sont désormais bien pris en compte
- #145 Lors du premier lancement, ce sont cinq karaokés aléatoires qui sont ajoutés à la liste de lecture courante, pas juste les 5 premiers.
- #73 Le fond d'écran quand un karaoké n'est pas actif est maintenant personnalisable ! Spécifiez son nom avec l'option `PlayerBackground` dans votre fichier `config.ini`. Les fonds d'écran doivent être déposés dans le dossier `app/backgrounds`
- #62 La génération ne foutra plus en l'air vos .kara en cas d'erreur inattendue.
- #154 Lors de la génération, les fichiers cachés sont ignorés.
- #131 Utiliser la molette quand la souris passe sur la fenêtre du lecteur monte ou descend le son au lieu d'avancer/reculer dans la vidéo.
- #165 Sous macOS, le fichier de log reste dans le dossier de Karaoke Mugen (avant il allait dans le dossier home de l'utilisateur)
- #60 La génération de la base de données affiche désormais sa progression pour éviter de vous faire baliser lorsque que votre ordinateur est trop lent.
- Le lecteur vidéo sous macOS gére bien mieux le plein écran (utilisation de `--no-native-fs`)
- Les informations à l'écran lorsqu'un karaoké n'est pas en cours sont écrites plus clairement, et le QR Code mieux dimensionné
- Les listes de lecture sont maintenant triées par nom
- L'interface est désormais totalement en thème sombre

### Correctifs

- #133 Le paramètre "Toujours au dessus" fonctionne désormais normalement
- #136 Fixes d'interface et francisation de nombreux éléments texte encore en anglais
- #140 Revue du CSS de l'interface
- #129 Optimisation de la base de données pour ne plus ajouter d'ASS vides en cas de hardsubs.
- #148 L'initialisation de certaines pages de la webapp se passe mieux
- Lors de la génération de la base de données, le champ "series" d'un .kara est maintenant pris en compte correctement
- De nombreux, nombreux correctifs d'interface.
- L'import de grandes playlists fonctionne désormais normalement
- Le lecteur s'arrête normalement si la liste de lecture courante est vide et qu'on essaye de la jouer.
- Lorsque la base de données est vide, le Dummy Plug s'active pour vous ajouter 5 karaokés au hasard de votre base. Il n'y aura plus de message d'erreur si vous avez moins de 5 karaokés, voire pas de karaoké du tout.

### Problèmes connus

- Sous certaines configurations macOS, un warning de type `UnhandledPromiseRejection` peut apparaître au changement de chansons, nous sommes sur le coup. Ce message n'empêche en aucun cas d'utiliser l'application.
- Si vous avez des critères de blacklist assez divers, certains peuvent être éronnés après une regénération de votre base. Pensez à les vérifier après chaque génération ! Voir l'issue #114

## v2.0 Beta 1 "Finé Flegmatique" - 18/09/2017

Aucune note de sortie

## v2.0 Alpha "Finé Folklorique" - 29/08/2017

Aucune note de sortie
