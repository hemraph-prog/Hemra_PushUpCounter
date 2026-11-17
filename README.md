# Hemra_PushUpCounter

Browser-based push-up counter using MediaPipe pose landmarks.

## Features

- Uses your webcam to detect pose landmarks in real time.
- Counts push-ups as you move from the up position to the down position and back.
- Draws a motion overlay on top of the camera feed so you can see the detected skeleton.

## Run it locally

1. Open a terminal in this repository.
2. Start a local web server:

   python3 -m http.server 8000

3. Open this page in a browser:

   http://localhost:8000

4. Allow camera access when prompted.
5. Stand in front of the camera and click "Start camera".

## Notes

- This app runs in the browser and requires webcam access.
- The counting logic works best when your full body is visible and centered in the frame.
- If your browser blocks the camera, try using Chrome or Edge.

