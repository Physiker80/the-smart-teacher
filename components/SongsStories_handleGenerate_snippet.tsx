
const handleGenerate = async () => {
    if (!initialTopic || isGenerating) return;
    setIsGenerating(true);
    try {
        const newItem = await generateSongOrStory(initialTopic, activeTab === 'songs' ? 'song' : 'story', initialGrade || 'الصف الثالث');
        if (activeTab === 'songs') {
            setSongs([newItem as SongItem, ...songs]);
        } else {
            setStories([newItem as StoryItem, ...stories]);
        }
    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء التوليد. الرجاء المحاولة مرة أخرى.");
    } finally {
        setIsGenerating(false);
    }
};
