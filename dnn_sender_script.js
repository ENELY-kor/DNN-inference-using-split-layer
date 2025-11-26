 /* TODO: Update the IP address and port number to match your server configuration */
const signalingSocket = io('http://localhost:9999')

const localVideo_1 = document.getElementById('localVideo_1');

const connectButton = document.getElementById('connectButton');
const generateButton = document.getElementById('generateButton');
const playButton_1 = document.getElementById('playButton_1');
const labelDisplay = document.getElementById('label');

// To track the rxvolume
const rxBytes = document.getElementById('rxBytes');

// Constants. DO NOT CHANGE!
const frameRate = 30;
const interval = 1000/frameRate;
const room = 'Project2_WebRTC_ML';

let peerConnection;
let configuration;
let dataChannel;
let initiator = false;

async function startLocalStream_1() {
  try {
    // Load local video into the local video element
    localVideo_1.src = 'video.mp4'; // Path to your local video
    await localVideo_1.play();
    console.log('Local video 1 started');
    
  } catch (error) {
    console.error('Error accessing local video 1.', error);
  }
}


function createPeerConnection() {
  console.log('Creating peer connection');
  peerConnection = new RTCPeerConnection(configuration);
  initiator = true;
  /*
  TODO
  1. Create a data channel if this is the initiating peer
  2. Handle incoming data channel from remote peer
  */
  if (initiator) {
    // 데이터 채널 생성
    dataChannel = peerConnection.createDataChannel("dataChannel");

    // 데이터 채널 이벤트 설정
    setupDataChannel(dataChannel);
  }
  // 상대방에서 데이터 채널을 받으면 설정

  peerConnection.ondatachannel = (event) => {
    console.log('Received remote data channel');
    dataChannel = event.channel; // 받은 채널 저장
    setupDataChannel(dataChannel); // 받은 채널에 대해 설정
  };

  peerConnection.onicecandidate = (event) => {
    /* TODO
    1. If you received event that the ICE candidate is generated, send the ICE candidate to the peer
    */
    if (event.candidate) {
      signalingSocket.emit('signal', { room, message: { type: 'iceCandidate', candidate: event.candidate } });
    }
  };

  // Logging peers connected
  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === 'connected') {
      console.log('Peers connected');
    }
  };
}

signalingSocket.on('connect', () => {
  console.log('Connected to signaling server');
  signalingSocket.emit('join', room);
});

signalingSocket.on('signal', async (message) => {
  console.log('Received signal:', message);
  /* TODO
  1. Regarding the type of message you received, handle the offer, answer, and ICE candidates
  */
  if (!peerConnection) {createPeerConnection();}

  if (message.type === 'offer') { 
    console.log('Received offer:', message.sdp);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    signalingSocket.emit('signal', { room, message: { type: 'answer', sdp: peerConnection.localDescription } });
    console.log('Sent answer');
  }

  if (message.type === 'answer') {
    console.log('Received answer:', message.sdp);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
  }

  if (message.type === 'iceCandidate') {
    console.log('Received ICE candidate:', message.candidate);
    await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
  }
});

// Function to create an offer
async function createOffer() {
  if (!peerConnection) createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signalingSocket.emit('signal', { room, message: { type: 'offer', sdp: peerConnection.localDescription } });
  console.log('Creating offer');
}

connectButton.addEventListener('click', async () => {
  initiator = true;
  createOffer(); 
});

let captureInterval;

generateButton.addEventListener('click', async () => {
  captureInterval = setInterval(captureFrameFromVideo, interval);

  // Stop capturing when the video ends
  localVideo_1.addEventListener('ended', () => {
    clearInterval(captureInterval);
    // Capture the last frame and process it
    captureFrameFromVideo();
  });
});

// Function to capture video frames
function captureFrameFromVideo() {
  /* TODO 
  1. Get the current frame from the video using the canvas element
  2. Reshape the frame to the approriate dimensions for the DNN model
  3. Call 'test' function for DNN inference
  HINT : check the model structure in the python file.
  */
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Set canvas size to match the input size expected by the model
  canvas.width = 32;
  canvas.height = 32;

  // Draw the current frame of the video onto the canvas from remote video
  context.drawImage(localVideo_1, 0, 0, canvas.width, canvas.height);

  // Get the image data from the canvas
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  
  // Convert the image data to a tensor
  const inputTensor = preprocessImage(imageData);
  
  return test(inputTensor);
}
//////////임의로 만든 test code
//////////임의로 만든 test code
function preprocessImage(imageData) {
  const height = 32;
  const width = 32;
  const channels = 3;
  dims = [1,3,32,32];
  // Initialize tensor with the proper size
  const tensor = new Float32Array(1 * channels * height * width); // Shape: [1, 3, 32, 32]
  let tensorIndex = 0;
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i] / 255.0;     // Red channel
    const g = imageData[i + 1] / 255.0; // Green channel
    const b = imageData[i + 2] / 255.0; // Blue channel
    //make value 0~1.0

    tensor[tensorIndex] = r;//(r - mean[0]) / std[0]; // Red channel
    tensor[tensorIndex + height * width] = g;//(g - mean[1]) / std[1]; // Green channel
    tensor[tensorIndex + 2 * height * width] = b; // (b - mean[2]) / std[2]; // Blue channel    
    //정규화
    tensorIndex++;
  }
  return new ort.Tensor('float32', tensor, dims);
}
/////////////
//DNN inference code
async function test(imageData) {
  /* TODO 
  1. Load the ONNX model
  2. Convert image data to tensor used by the onnxruntime
  3. Run the inference
  4. Send the output data to the receiver via the data channel
  WARNING : You have to do CORRECT DATA CONVERSION to get the correct label!
  HINT : Think about the memory layout of the image data and the tensor
  HINT : https://onnxruntime.ai/docs/api/js/index.html
  HINT : https://onnxruntime.ai/docs/
  */
  try { 
    //test for three case of CNN split
    const session = await ort.InferenceSession.create('model_sender.onnx');
    //const session = await ort.InferenceSession.create('model_sender_h.onnx');
    //const session = await ort.InferenceSession.create('model_sender_m.onnx');

    console.log('Model loaded successfully');
    // Run the model inference

    const feeds = { input: imageData };
    const output = await session.run(feeds);

    const outputTensor = output.output;
    if (dataChannel && dataChannel.readyState === 'open') {
      const buffer = outputTensor.data;
      dataChannel.send(buffer); // Send the raw buffer of the Float32Array // buffer
      console.log('Data sent to receiver');
    } else {
      console.error('Data channel is not open');
    }
  } catch (err) {
    console.error('Error during model inference:', err);
  }

}

function setupDataChannel(channel) {
  /*
  TODO
  1. Define the behavior of the data channel (E.g. onopen, onmessage)
  */
  channel.onopen = () => {
    console.log("Data channel is open and ready to send messages");
  };
  channel.onmessage = (event) => {
    console.log("Message received from peer: ", event.data);
    rxBytes.innerHTML = `Received message: ${event.data}`;
  };
  // 데이터 채널에서 오류가 발생하면 호출되는 이벤트 핸들러
  channel.onerror = (error) => {
    console.error("Data channel error:", error);
  };
  // 데이터 채널이 닫히면 호출되는 이벤트 핸들러
  channel.onclose = () => {
    console.log("Data channel is closed");
  };
}


// Display the label on the webpage. DO NOT CHANGE!
function labelprocess(outTensor){
  CIFAR10_CLASSES = ["airplane", "automobile", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck"];
  let label_output = "";
  for (let i = 0; i < outTensor.length; i++) {
    label_output += CIFAR10_CLASSES[i] + ": " + outTensor[i].toFixed(2) + "<br>";
  }
  labelDisplay.innerHTML = label_output;
}

playButton_1.addEventListener('click', () => {
  /* TODO 
  1. Start the local video stream when playButton_1 is clicked
  */


  try {
    startLocalStream_1(); // 비동기 함수 호출 대기
    console.log('Local stream started and playing');
  } catch (error) {
    console.error('Failed to start local stream:', error);
  }
});