# Island Generator

Inside island.js exists an Island class. Create an island to generate all of the nessecary information to use it's height function. Which describes a sampling of a continuous height function for the island (without noise). When layered with noise, this creates asthetically pleasing island shapes that can be used robustly in gradient descent or curve tracking applications.

Currently it depends on three js for it's implenentation of a 3 vector, this may be changed in future updates to be independent.

There is also a chunking script in the project folder, that allows for a grid of terrain pieces to be dynamicly loaded and unloaded.