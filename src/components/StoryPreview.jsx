function StoryPreview({ story }) {
  if (!story.pages || story.pages.length === 0) {
    return null;
  }

  return (
    <section className="story-preview">
      <div className="card">
        <h2>{story.title || 'Generated story preview'}</h2>
        <p>Review each page and its illustration below.</p>
      </div>
      {story.pages.map((page) => (
        <article key={page.pageNumber} className="card page-card">
          <h3>Page {page.pageNumber}</h3>
          <p>{page.text}</p>
          <img src={page.imageUrl} alt={`Story illustration for page ${page.pageNumber}`} />
        </article>
      ))}
    </section>
  );
}

export default StoryPreview;
