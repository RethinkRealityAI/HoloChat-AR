export const startListening = (onResult: (text: string) => void, onError: (err: any) => void) => {
  if (!('webkitSpeechRecognition' in window)) {
    onError("Speech recognition not supported in this browser.");
    return null;
  }
  
  // @ts-ignore
  const recognition = new window.webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    // console.log("Listening...");
  };

  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript;
    onResult(text);
  };

  recognition.onerror = (event: any) => {
    onError(event.error);
  };

  recognition.onend = () => {
    // console.log("Stopped listening");
  };

  recognition.start();
  return recognition;
};
