document.getElementById('fileInput').addEventListener('change', function (e) {
  if (cv && cv.imread) {
    processImage(e);
  } else {
    // OpenCV.js가 초기화될 때까지 기다림
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
    let canvasOriginal = document.getElementById('canvasOriginal');
    let context = canvasOriginal.getContext('2d');

    canvasOriginal.width = image.width;
    canvasOriginal.height = image.height;
    context.drawImage(image, 0, 0, image.width, image.height);

    let src = cv.imread('canvasOriginal');
    if (src.empty()) {
      console.error('Cannot read the image');
      return;
    }
    let gray = new cv.Mat();
    let thresh = new cv.Mat();
    let noiseFree = new cv.Mat();

    // 그레이스케일 변환
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    displayImage(gray, 'canvasGray');

    // 노이즈 제거를 위한 모폴로지 연산
    let kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.morphologyEx(gray, noiseFree, cv.MORPH_OPEN, kernel);
    displayImage(noiseFree, 'canvasNoiseFree');

    // 이진화
    cv.threshold(noiseFree, thresh, 100, 255, cv.THRESH_BINARY_INV);
    displayImage(thresh, 'canvasBinary');

    // 윤곽선 검출 및 표시
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(
      thresh,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    // 면적 작은 거는 제외, 면적은 픽셀 단위로 계산됨
    let filteredContours = new cv.MatVector();
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i);
      let area = cv.contourArea(cnt, false);
      // 면적 5 보다 큰 윤곽선만
      if (area < 4) continue;
      let rect = cv.boundingRect(cnt);
      // 세로 길이 긴거 제거
      if (rect.height > rect.width * 1.5) continue;
      // 선 제거
      if (rect.height < 4 && rect.height > 20) continue;

      filteredContours.push_back(cnt);
    }

    displayContours(src, filteredContours, 'canvasContours');

    // 경계 상자 그리기
    // drawBoundingBoxes(src, contours);
    drawClusteredBoundingBoxes(src, filteredContours);
    displayImage(src, 'canvasOutput');

    // 자원 정리
    src.delete();
    gray.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();

    noiseFree.delete();
    kernel.delete();
  };
  image.src = imageUrl;
}

function displayImage(mat, canvasId) {
  if (mat instanceof cv.Mat && !mat.empty()) {
    cv.imshow(canvasId, mat);
  } else {
    console.error('Invalid cv.Mat instance passed to displayImage');
  }
}

function displayContours(src, contours, canvasId) {
  let contourImg = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  for (let i = 0; i < contours.size(); ++i) {
    let color = new cv.Scalar(255, 0, 0);
    cv.drawContours(contourImg, contours, i, color, 1, cv.LINE_8);
  }
  displayImage(contourImg, canvasId);
  contourImg.delete();
}

function drawBoundingBoxes(src, contours) {
  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let rect = cv.boundingRect(cnt);
    let point1 = new cv.Point(rect.x, rect.y);
    let point2 = new cv.Point(rect.x + rect.width, rect.y + rect.height);
    cv.rectangle(src, point1, point2, [0, 255, 0, 255], 2);
  }
}
function drawClusteredBoundingBoxes(src, contours) {
  // 클러스터링을 위해 각 윤곽선의 중심 좌표를 저장하는 배열
  let centers = [];
  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let moments = cv.moments(cnt);
    let cx = moments.m10 / moments.m00;
    let cy = moments.m01 / moments.m00;
    centers.push({ x: cx, y: cy, contour: cnt });
  }

  // 클러스터링 알고리즘 적용 (여기서는 단순 거리 기준 예시)
  let clusters = [];
  // let threshold = 50; // 클러스터링 거리 임곗값
  let threshold = 50;
  centers.forEach((center, idx) => {
    if (!center.clustered) {
      let cluster = [center];
      centers.forEach((other, oidx) => {
        if (idx !== oidx && !other.clustered) {
          let distance = Math.sqrt(
            Math.pow(center.x - other.x, 2) + Math.pow(center.y - other.y, 2)
          );
          if (distance < threshold) {
            cluster.push(other);
            other.clustered = true;
          }
        }
      });
      clusters.push(cluster);
    }
  });

  // 각 클러스터에 대해 경계 상자 계산 및 그리기
  clusters.forEach((cluster) => {
    let xMin = Infinity,
      yMin = Infinity,
      xMax = 0,
      yMax = 0;
    cluster.forEach((item) => {
      let rect = cv.boundingRect(item.contour);
      xMin = Math.min(xMin, rect.x);
      yMax = Math.max(yMax, rect.y + rect.height);
      xMax = Math.max(xMax, rect.x + rect.width);
      yMin = Math.min(yMin, rect.y);
    });
    let point1 = new cv.Point(xMin, yMin);
    let point2 = new cv.Point(xMax, yMax);
    cv.rectangle(src, point1, point2, [0, 255, 0, 255], 2);
  });
}
