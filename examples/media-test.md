---
title: "Media Upload E2E Test"
tags:
  - test
  - media
audience: "everyone"
---

# Media Upload End-to-End Test

This file is used for automated end-to-end validation of local image upload via the Substack API transport.

## Single Local Image

![Test PNG](./assets/test-image-big.png "A test PNG for upload validation")

## Mixed Content — Remote Images (should be skipped)

![Remote image](https://example.com/remote-banner.jpg "This remote image should be skipped during upload")

![Another remote](https://example.com/remote-icon.png "Also skipped")

## Multiple Local Images in Sequence

![First local](./assets/test-image-big.png "First")
![Second local](./assets/test-image-big.png "Second")
![Third local](./assets/test-image-big.png "Third")

## Image with No Alt Text

![](./assets/test-image-big.png "No alt text")

## Paragraph Between Images

Here is a paragraph of text separating groups of images.

![Local after paragraph](./assets/test-image-big.png "After paragraph")
