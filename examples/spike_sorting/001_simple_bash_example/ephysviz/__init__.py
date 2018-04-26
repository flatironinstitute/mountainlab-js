import numpy as np
from matplotlib import pyplot as plt

def view_templates(templates,*,title=None):
    M,T,K=np.atleast_3d(templates).shape
    horizontal_spacing=int(T/5)
    spacing_between_channels=np.max(np.abs(templates.ravel()))
    channel_colors=_get_channel_colors(M)

    for k in range(K):
        x0=(T+horizontal_spacing)*k
        for m in range(M):
            y0=spacing_between_channels*(M-m)
            plt.plot(x0+np.arange(T),y0+templates[m,:,k].ravel(),color=channel_colors[m])

    ax=plt.gca()
    ax.axes.get_xaxis().set_visible(False)
    ax.axes.get_yaxis().set_visible(False)

    if title:
        plt.title(title)
    plt.show()

def _get_channel_colors(M):
    cm = plt.get_cmap('gist_ncar')
    channel_colors=[]
    for m in range(M):
        channel_colors.append(cm(1.0*(m+0.5)/M))
    return channel_colors