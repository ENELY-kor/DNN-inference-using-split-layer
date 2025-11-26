# DNN-inference-using-split-layer
Privacy-preserving AI, Split Inference, WebRTC
# Overview
The surge in high-performance AI services presents a significant challenge for mobile devices constrained by limited resources. The conventional solution—sending raw data to the cloud for processing and receiving the result—transfers the burden of heavy data transmission and poses a severe risk of information leakage to the user.

This project aims to solve this dilemma by splitting the Deep Neural Network (DNN) layers between the user's device (Client) and the cloud server (Server). By performing initial inference on the mobile device, we aim to prevent raw data exposure and transmit only the smaller latent data (intermediate results), thereby reducing the consumer's transmission overhead (packet size).

The primary objective is to quantify this reduction by measuring the packet transmission volume at various layer split points. Simultaneously, we seek to demonstrate the stability (fidelity) of this approach by comparing the results from split inference with those from direct local inference, ensuring no data distortion occurs.

* Core Objective: Enhance data security and reduce transmission costs in mobile AI services by implementing split DNN inference.
* Key Metric: Packet Transmission Volume measured at different layer boundaries.
* Verification: Comparing inference results (local vs. remote) to confirm Data Fidelity.

# Methodology & Implementation
