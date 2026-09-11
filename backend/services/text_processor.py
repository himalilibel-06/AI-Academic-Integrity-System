import re
import nltk


def _ensure_nltk_resources():
    """Ensure required NLTK data resources are downloaded safely."""
    for resource in ["stopwords", "wordnet", "omw-1.4"]:
        try:
            nltk.data.find(f"corpora/{resource}")
        except LookupError:
            nltk.download(resource, quiet=True)


_ensure_nltk_resources()

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer


# Load English stop words
STOP_WORDS = set(stopwords.words("english"))

# Create lemmatizer
lemmatizer = WordNetLemmatizer()


def preprocess_text(text: str) -> str:
    """
    Cleans and preprocesses text before plagiarism analysis.
    """

    # Convert text to lowercase
    text = text.lower()

    # Remove punctuation and special characters
    text = re.sub(r"[^a-zA-Z\s]", " ", text)

    # Split text into individual words
    words = text.split()

    # Remove stop words and lemmatize
    processed_words = []

    for word in words:
        if word not in STOP_WORDS:
            lemma = lemmatizer.lemmatize(word)
            processed_words.append(lemma)

    # Join words back into a single string
    return " ".join(processed_words)