<!-- Header -->
<div align="center">
    <a href="https://github.com/HeadTriXz/Barry">
        <img src="https://github.com/HeadTriXz/Barry/assets/32986761/72d2c27d-925c-465f-a6a3-fe836e86fad6" alt="Banner Barry">
    </a>
</div>

# Contribution Guidelines
Welcome to the contribution guidelines for Barry! We appreciate your interest in contributing to our project and we encourage you to read these guidelines to ensure a smooth and collaborative experience.

## Table of Contents
- [Installation](#installation)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)
- [Pull Requests](#pull-requests)
- [Testing](#testing)

## Installation
To get started with Barry, you need to have Node.js (version 20 or later) installed on your machine. You can download and install the latest version of Node.js from the official website: [https://nodejs.org](https://nodejs.org).

1. Fork the project repository on GitHub.
2. Clone your forked repository to your local machine.
3. Install the project dependencies by running the following command:
```sh
npm install
```

## Bug Reports
If you encounter any bugs or issues while using the project, please report them. To submit a bug report, follow these guidelines:
1. Go to the [issue tracker][issues] and create a new issue.
2. Provide a clear and descriptive title for the issue.
3. Describe the steps to reproduce the issue.
4. Include any relevant error messages or screenshots.
5. Specify the version you are using.

Bug reports help us identify and fix issues, so your contribution is highly valuable!

## Feature Requests
If you have any ideas or feature requests that you would like to see implemented in the project, please let us know. To submit a feature request, follow these guidelines:
1. Go to the [issue tracker][issues] and create a new issue.
2. Provide a clear and descriptive title for the feature request.
3. Describe the feature in detail, including any specific requirements or use cases.
4. If possible, provide examples or mockups to illustrate the feature.

Feature requests help us understand the needs of our users and shape the project accordingly. We appreciate your input!

## Pull Requests
If you would like to contribute code to the project, you can do so by creating a pull request. To submit a pull request, follow these steps:
1. Fork the repository to your own GitHub account.
2. Clone your forked repository:
```sh
git clone https://github.com/your-username/barry.git
```
3. Create a new branch for your changes:
```sh
git checkout -b my-feature
```
4. Make the necessary changes and commit them.
5. Push your changes to your forked repository:
```sh
git push origin my-feature
```
6. Go to the original repository and [create a pull request][pr], including a clear description of your changes and any relevant information.


**Please ensure that your pull request title follows the [conventional commits](https://www.conventionalcommits.org/) format.**

Pull requests allow us to review and incorporate your changes into the project. We appreciate your contributions!

## Testing
Barry relies on a comprehensive suite of tests to maintain code quality. Before submitting a pull request, make sure to test your changes thoroughly to ensure they meet the project's quality standards and do not introduce any regressions. Here are some guidelines for testing:
- Tests are required for all code changes, including bug fixes and new features.
- Write unit tests that cover the functionality of your code.
- Include test cases that cover both expected and edge cases.
- Run the existing test suite to ensure that your changes do not break any existing functionality.
- Ensure that your tests provide meaningful coverage and effectively validate the behavior of your code.

To run the tests locally, use the following command:
```sh
npm test
```

This command will execute the test suite and provide feedback on the test results.

[issues]:https://github.com/HeadTriXz/Barry/issues
[pr]:https://github.com/HeadTriXz/Barry/compare
