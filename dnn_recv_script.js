 /* TODO: Update the IP address and port number to match your server configuration */
 const signalingSocket = io('http://localhost:9999')

const labelDisplay = document.getElementById('label');

// for tracking the rxvolume
const rxBytes = document.getElementById('rxBytes');

//for capturingimage and sending to DNN
const capturingCanvas = document.createElement('canvas');
const capturingContext = capturingCanvas.getContext('2d');

// Constants. DO NOT CHANGE!
const frameRate = 30;
const interval = 1000/frameRate;
const room = 'Project2_WebRTC_ML';

let peerConnection;
let configuration;
let dataChannel;
let initiator = false;

function createPeerConnection() {
  console.log('Creating peer connection');
  peerConnection = new RTCPeerConnection(configuration);

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

  // logging peers connected
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

// Hint: createOffer function
async function createOffer() {
  if (!peerConnection) createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  signalingSocket.emit('signal', { room, message: { type: 'offer', sdp: peerConnection.localDescription } });
  console.log('Creating offer');
}

//DNN inference code
async function test(intermediateTensor) {
  /* TODO 
  1. Load the ONNX model
  2. Convert image data to tensor used by the onnxruntime
  3. Run the inference
  4. Display the label on the webpage
  */
  try { 
    const session = await ort.InferenceSession.create('model_recv.onnx');
    //const session = await ort.InferenceSession.create('model_recv_h.onnx');
    //const session = await ort.InferenceSession.create('model_recv_m.onnx');

    console.log('Model loaded successfully');
      // Run the model inference
    const inputTensor = new ort.Tensor('float32', intermediateTensor, [1, 32, 16, 16]);//for model_recv
    //const inputTensor = new ort.Tensor('float32', intermediateTensor, [1, 2048]);//for model_recv_h
    //const inputTensor = new ort.Tensor('float32', intermediateTensor, [1, 64, 8, 8]);//for model_recv_m
    const feeds = { input: inputTensor };
    const output = await session.run(feeds);
    
    // Extract output tensor
    const outputTensor = output.output;

    // Process the output and display the label
    labelprocess(outputTensor.data);
  } catch (err) {
    console.error('Error during model inference:', err);
  }
}

const headings = document.querySelectorAll('h2');
headings.forEach((heading) => {
  if (heading.textContent.trim() === 'Not Connected') {
    heading.classList.add('not-connected');
  }
});

function setupDataChannel(channel) {
  /*
  TODO
  1. Define the behavior of the data channel when the channel receives a message (onmessage)
  HINT : You can call 'test' function when the channel receives a message to start the DNN inference
  HINT : Behavior of channel.onopen is already defined. You can refer to it.
  */
  channel.onopen = () => {
    console.log('Data channel opened');
    const headings = document.querySelectorAll('h2');
    headings.forEach((heading) => {
      if (heading.textContent.trim() === 'Not Connected') {
        // Update text content and apply the "connected" style
        heading.textContent = 'Connected!!';
        heading.classList.remove('not-connected');
        heading.classList.add('connected');
      }
    });
    document.getElementById('rxBytes').classList.add('active');
  };
  // Handling the data channel message event
  channel.onmessage = (event) => {
    console.log('Received message from data channel:', event.data);
    const rec_buf = event.data;
    const rec_ten = new Float32Array(rec_buf);
    console.log('change tensor result:', rec_ten);
    test(rec_ten); // Pass received ArrayBuffer to test function

  };

  // Optionally, you can also handle the data channel closing event
  channel.onclose = () => {
    console.log('Data channel closed');
  };

  // Optionally, you can handle errors in the data channel
  channel.onerror = (error) => {
    console.error('Data channel error:', error);
  };
}


// Display the label on the webpage.
function labelprocess(outTensor){
  CIFAR10_CLASSES = ["airplane", "automobile", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck"];
  let label_output = "";
  for (let i = 0; i < outTensor.length; i++) {
    label_output += CIFAR10_CLASSES[i] + ": " + outTensor[i].toFixed(2) + "<br>";
  }
  labelDisplay.innerHTML = label_output;
}

// Tracking network traffic.
let previousBytesReceived = 0;
let previousMessagesReceived = 0;
setInterval(() => {
  peerConnection.getStats(null).then(stats => {
      stats.forEach(report => {
          if (report.type === 'data-channel' && report.bytesReceived !== undefined) {
              const currentBytesReceived = report.bytesReceived;
              const currentMessagesReceived = report.messagesReceived;
              
              const bytesReceivedInInterval = currentBytesReceived - previousBytesReceived;
              const messagesReceivedInInterval = currentMessagesReceived - previousMessagesReceived;

              rxBytes.innerHTML = `${bytesReceivedInInterval} bytes/s \n ${messagesReceivedInInterval} messages/s`;

              previousBytesReceived = currentBytesReceived;
              previousMessagesReceived = currentMessagesReceived;
          }
      });
  });
}, 1000); 
