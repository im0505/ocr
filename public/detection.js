document.getElementById('fileInput').addEventListener('change', function (e) {
  if (cv && cv.imread) {
    processImage(e);
  } else {
    // Wait for OpenCV to initialize
    cv['onRuntimeInitialized'] = () => {
      processImage(e);
    };
  }
});

function processImage(e) {
  let file = e.target.files[0];
  let imageUrl = URL.createObjectURL(file);

  let image = new Image();
  image.onload = function () {
    let canvas = document.getElementById('canvasOutput');
    let context = canvas.getContext('2d');

    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0, image.width, image.height);

    let src = cv.imread(canvas);
    let gray = new cv.Mat();
    let thresh = new cv.Mat();

    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply binary threshold
    cv.threshold(gray, thresh, 150, 255, cv.THRESH_BINARY_INV);

    // Find contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(
      thresh,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    // Draw bounding boxes
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i);
      let rect = cv.boundingRect(cnt);
      let point1 = new cv.Point(rect.x, rect.y);
      let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
      cv.rectangle(src, point1, point2, [0, 255, 0, 255], 2);
    }

    cv.imshow('canvasOutput', src);
    src.delete();
    gray.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();
  };
  image.src = imageUrl;
}
