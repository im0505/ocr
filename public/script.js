const video = document.getElementById('videoElement');
const captureButton = document.getElementById('captureButton');
const canvas = document.getElementById('canvasElement');

if (navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(function (stream) {
      video.srcObject = stream;
    })
    .catch(function (error) {
      console.log('카메라 접근에 실패했습니다:', error);
    });
} else {
  console.log('브라우저가 카메라 접근을 지원하지 않습니다.');
}

captureButton.addEventListener('click', function () {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  canvas.toBlob(function (blob) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);

    document.body.appendChild(img);

    Tesseract.recognize(blob, 'eng', {
      logger: (m) => console.log(m),
      cacheMethod: 'none',
    })
      .then(({ data }) => {
        if (data && data.text) {
          console.log(data.text);
        } else {
          console.log('텍스트 인식에 실패했습니다.');
        }
      })
      .catch((error) => {
        console.error('Tesseract.js 오류:', error);
      });
  }, 'image/png');
});
