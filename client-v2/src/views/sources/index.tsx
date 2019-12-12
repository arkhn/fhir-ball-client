import { Button, Card, Elevation, Icon, Spinner, Tag } from '@blueprintjs/core';
import * as QueryString from 'query-string';
import * as React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import Navbar from '../../components/Navbar';

import { changeSelectedSource } from '../../services/selectedNode/actions';

// Import types
import { IReduxStore, IView } from '../../types';

import './style.less';

// GRAPHQL OPERATIONS

// Queries
const qSources = require('../../graphql/queries/sources.graphql');

export interface ISourcesState {}

interface IState {}

interface ISourcesViewState extends IView, ISourcesState {}

const mapReduxStateToReactProps = (state: IReduxStore): ISourcesViewState => {
  return {
    data: state.data,
    dispatch: state.dispatch
  };
};

const reduxify = (
  mapReduxStateToReactProps: any,
  mapDispatchToProps?: any,
  mergeProps?: any,
  options?: any
): any => {
  return (target: any) =>
    connect(
      mapReduxStateToReactProps,
      mapDispatchToProps,
      mergeProps,
      options
    )(target) as any;
};

class SourcesView extends React.Component<ISourcesViewState, IState> {
  constructor(props: ISourcesViewState) {
    super(props);
  }

  public render = () => {
    const { data, dispatch } = this.props;

    return (
      <div>
        <Navbar />
        <div id="main-container-softwares">
          <Button
            icon={'add'}
            intent={'primary'}
            large={true}
            onClick={() => {
              this.props.history.push('/newSource');
            }}
          >
            Ajouter une source / un logiciel
          </Button>
          <Query fetchPolicy="network-only" query={qSources}>
            {({ data, loading }: any) => {
              return (
                <div id="software-cards">
                  {loading ? (
                    <Spinner />
                  ) : (
                    data.sources.map((source: any, index: number) => {
                      return (
                        <Card
                          elevation={Elevation.TWO}
                          interactive={true}
                          key={index}
                          onClick={() => {
                            dispatch(
                              changeSelectedSource(
                                source.id,
                                source.name,
                                source.hasOwner
                              )
                            );
                            this.props.history.push({
                              pathname: '/mapping',
                              search: QueryString.stringify({
                                sourceId: source.id
                              })
                            });
                          }}
                        >
                          <h2>{source.name}</h2>
                          <div className="tags">
                            <Tag>DPI</Tag>
                            <Tag>Généraliste</Tag>
                            <Tag>Prescription</Tag>
                          </div>

                          <div>
                            <div className="flexbox">
                              <span>
                                <Icon
                                  icon="layout-hierarchy"
                                  color="#5C7080"
                                />
                                <span>{source.mappingProgress[0]} Ressources</span>
                              </span>
                              <span>
                                <Icon icon="tag" color="#5C7080" />
                                <span>{source.mappingProgress[1]} Attributs</span>
                              </span>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              );
            }}
          </Query>
        </div>
      </div>
    );
  };
}

export default withRouter(connect(mapReduxStateToReactProps)(
  SourcesView
) as any);