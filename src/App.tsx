import React, {ReactElement, useState, useEffect} from 'react';
import {Device} from 'react-native-ble-plx';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  Button,
  View,
  FlatList,
  AppState,
  AppStateStatus,
} from 'react-native';
import {
    establishConnection,
    cancelAllConnections,
    executeJob,
    scheduleBackgroundProcessingTask, doSearch,
} from './BleManager';
import {
  addLogListener,
  removeLogListener,
  clearAllLogs,
  collectLogs,
  log,
} from './Utils';

/**
 * This is an application widget containing simple buttons and list of
 * persisted logs.
 */
const App: () => ReactElement = () => {
  // Register log listener
  const [messages, setMessages] = useState<Array<string> | null>(null);

  const logListener = (message: string) => {
    setMessages(oldMessages => {
      if (oldMessages == null) {
        return [];
      }
      return [...oldMessages, message];
    });
  };

  useEffect(() => {
    addLogListener(logListener);
    collectLogs()
      .then(logs => {
        setMessages(oldMessages => {
          if (oldMessages == null) {
            return logs;
          } else {
            return [...logs, ...oldMessages];
          }
        });
      })
      .catch();
    return () => {
      removeLogListener(logListener);
    };
  }, []);

  // Handle connection
  const [device, setDevice] = useState<Device | null>(null);
  const [connecting, setConnecting] = useState<boolean>(false);

  // Handle execution
  const [executing, setExecuting] = useState<boolean>(false);

  // Handle forground / background modes for logs.
  useEffect(() => {
    const appListener = (state: AppStateStatus) => {
      if (state === 'active') {
        collectLogs()
          .then(logs => {
            setMessages(oldMessages => {
              if (oldMessages == null) {
                return logs;
              } else {
                return [...logs, ...oldMessages];
              }
            });
          })
          .catch();
      } else {
        setMessages([]);
      }
    };
    AppState.addEventListener('change', appListener);
    return () => {
      AppState.removeEventListener('change', appListener);
    };
  }, []);

  return (
    <SafeAreaView style={styles.mainView}>
      <View style={styles.header}>
        <Button
          title={'Scan FG'}
          disabled={device != null || connecting}
          onPress={() => {
            setConnecting(true);
            doSearch()
            .then(() => {
              setConnecting(false);
            })
            .catch(error => {
              log(`Failed to connect: ${error.message}`);
              setConnecting(false);
              });
          }}
        />

        <Button
          title={'Scan BG'}
          disabled={device != null || connecting}
          onPress={() => {
            setConnecting(true);
            doSearch(true)
            .then(() => {
              setConnecting(false);
            })
            .catch(error => {
              log(`Failed to connect: ${error.message}`);
              setConnecting(false);
              });
          }}
        />

        <Button
          title={'Disconnect'}
          disabled={device == null}
          onPress={() => {
            if (device != null) {
              cancelAllConnections()
                .then(() => {
                  setDevice(null);
                  setExecuting(false);
                })
                .catch(error => {
                  log(`Failed to disconnect: ${error.message}`);
                  setDevice(null);
                  setExecuting(false);
                });
            }
          }}
        />

        <Button
          title={'Clear'}
          onPress={() => {
            clearAllLogs();
            setMessages([]);
          }}
        />
      </View>
      {messages == null ? (
        <Text>Waiting for messages...</Text>
      ) : (
        <FlatList
          style={styles.flatList}
          data={messages}
          renderItem={({item}) => {
            return (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{item}</Text>
              </View>
            );
          }}
          keyExtractor={(_item, index) => {
            return index.toString();
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainView: {
    backgroundColor: 'darkgray',
    flex: 1,
  },
  messageBox: {
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderColor: 'white',
  },
  messageText: {
    fontSize: 8,
    color: 'white',
  },
  flatList: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderColor: 'white',
  },
});

export default App;
