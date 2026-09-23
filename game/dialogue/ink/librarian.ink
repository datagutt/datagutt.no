// Solveig, library: open source (live pinned repos).
=== librarian ===
{ librarian > 1:
    {~(Shh.) Welcome back.|(Shh.) The new books are on the front shelf.|(Shh.) Every book here is free. Forever.}
- else:
    (Shh.) Welcome to the library. # nod
    Every book here is something Thomas gave away. Free to read, free to borrow, forever.
}
- (topics)
* {repo_count() > 0} [What's on the featured shelf?]
    {repo_count()} books on the featured shelf. Here they are.
    -> shelf(0)
* {repo_count() == 0} [Why is the featured shelf empty?]
    (Shh.) The books haven't arrived today. The Journal has the full list.
    -> topics
* [Why give it all away?]
    Because someone gave him theirs first. That's how libraries work.
    -> topics
* [Is there more?]
    Upstairs. Well, on GitHub. Same thing. # link: social github
    -> topics
+ [(Whisper) Thanks.]
    (Shh.) Come back any time.
    -> END

= shelf(i)
{ i >= repo_count(): -> topics }
"{repo_name(i)}". {repo_desc(i)} {repo_lang(i) != "": Written in {repo_lang(i)}.} {repo_stars(i)} {repo_stars(i) == 1: star|stars}.
-> shelf(i + 1)
