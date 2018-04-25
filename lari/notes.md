MLSTUDY -> "I have this pool ID", "Give me a container"

LariHub Logic
if !CONTAINER_ID & POOL_ID then
get all C_IDs associated with POOL_ID
check their stats and/or in use flag
pick best
then return container_id to MLstudy 

MLSTUDY then has a container ID and can proceed as before.



### Other things to implement
List current processes.
IN\_USE Flag
IF POOL_ID == some kubernetes cluster then spin me up a new pod in that cluster with mountainlab installed
IF some other flag then start a new docker container on my processing server with the things I need.
