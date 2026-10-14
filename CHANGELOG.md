# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Unreleased Changed

- Upgraded all Lambda function runtimes, Lambda container base images and the
  `bedrock-ez-search` package requirement from Python 3.12 to Python 3.13

---

## [0.1.0] - 2025-06-03

### 0.1.0 Added

- Initial development release

### 0.1.0 Changed

- Updated all Lambda function runtimes to Python 3.12 (except for PyTorch-based containers)

### 0.1.1 Changed

- Updated solution to use existing networking infrastructure if available