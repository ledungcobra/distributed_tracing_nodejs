function doSomeWork() {
  logger.info("Doing some work");
}

async function doSomeWork2() {
  logger.info("Doing some work 2");
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const genError = () => {
  throw new Error("Test error");
};

module.exports = {
  doSomeWork,
  doSomeWork2,
  sleep,
  genError,
};
